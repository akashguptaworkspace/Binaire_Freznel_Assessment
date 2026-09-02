import { nextClientId } from '../util/ids.js';

// One client machine. Each browser tab registers its own Client; the server
// doesn't limit how many there are.
export class Client {
  constructor({ label } = {}) {
    this.id = nextClientId();
    this.label = label || this.id;
    this.connectedAt = Date.now();
    this.lastSeen = Date.now();
    this.taskIds = new Set();
    this.stats = { submitted: 0, completed: 0, failed: 0, cancelled: 0, rejected: 0 };
  }

  heartbeat() {
    this.lastSeen = Date.now();
  }

  get idleMs() {
    return Date.now() - this.lastSeen;
  }

  toJSON() {
    return {
      id: this.id,
      label: this.label,
      connectedAt: this.connectedAt,
      lastSeen: this.lastSeen,
      idleMs: this.idleMs,
      openTasks: this.taskIds.size,
      stats: this.stats,
    };
  }
}

export default Client;
