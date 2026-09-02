import { rootLogger } from '../util/Logger.js';

// Periodic sweep that keeps the queue from wedging. Each pass:
//   - aging:     bump low tasks that have waited too long
//   - watchdog:  re-pump a process that has pending chunks, nothing in
//                flight, and free workers available
//   - client GC: reap tasks of clients that went away
//   - result GC: drop finished results past their TTL
//
// Runs on a timer in server mode; called from request handlers in serverless.
export class DeadlockGuard {
  #engine;
  #scheduler;
  #registry;
  #config;
  #log;
  #timer = null;
  #counters = { watchdogKicks: 0, clientsReaped: 0, tasksReaped: 0, resultsExpired: 0, sweeps: 0 };
  #lastSweep = 0;

  constructor({ engine, scheduler, registry, config }) {
    this.#engine = engine;
    this.#scheduler = scheduler;
    this.#registry = registry;
    this.#config = config;
    this.#log = rootLogger.child('guard');
  }

  start() {
    if (this.#timer) return;
    this.#timer = setInterval(() => this.sweep(), this.#config.guard.sweepMs);
    this.#timer.unref?.();
  }

  stop() {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
  }

  counters() {
    return {
      ...this.#counters,
      agingPromotions: this.#scheduler.agingPromotions,
      lastSweep: this.#lastSweep,
    };
  }

  sweep() {
    this.#lastSweep = Date.now();
    this.#counters.sweeps += 1;

    // aging
    this.#scheduler.promoteAging();

    // watchdog
    const diag = this.#scheduler.diagnostics();
    if (diag.stalledProcesses > 0) {
      this.#counters.watchdogKicks += 1;
      this.#log.warn(`watchdog: ${diag.stalledProcesses} stalled process(es), forcing pump`);
      this.#scheduler.pump();
    }

    // stale-client GC
    for (const client of this.#registry.list()) {
      if (client.idleMs > this.#config.clients.staleMs) {
        const reaped = this.#scheduler.reapForClient(client.id, 'client went away');
        this.#registry.remove(client.id);
        this.#counters.clientsReaped += 1;
        this.#counters.tasksReaped += reaped;
        if (reaped) this.#log.warn(`reaped ${reaped} task(s) from stale client ${client.id}`);
      }
    }

    // result TTL GC
    this.#counters.resultsExpired += this.#engine.gcResults();

    this.#scheduler.pump();
  }
}

export default DeadlockGuard;
