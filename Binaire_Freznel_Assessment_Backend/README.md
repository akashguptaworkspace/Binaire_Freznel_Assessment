# Binaire · Freznel Assessment — Backend (Multi-user Queueing System)

The **server** half of the assessment: a multi-purpose queueing system that
accepts CSV files from any number of client machines, schedules them by
priority, reduces every number in each file to a single scalar (**all-reduce**)
using a pool of Node **web workers** (`worker_threads`), streams the complete
queue status to every client over SSE, and structurally prevents every class of
deadlock.

**Frontend repo (React live dashboard):**
<https://github.com/akashguptawebdev/Binaire_Freznel_Assessment_Frontend>

Built with **JavaScript (ESM)** and **Node.js** (Express + `worker_threads`).
Functional logic is implemented with **classes and OOP** throughout. No
WebSocket library — realtime is Server-Sent Events, which also degrades to
polling.

---

## Quick start

```bash
npm install
npm start                 # http://localhost:4000  (GET / lists the API)
```

```bash
npm test                                       # unit tests (7)
npm run gen:samples                            # ./samples/*.csv of varying rank
npm run simulate -- --clients 10 --files 8     # load test: N clients × M files,
                                               # verifies every all-reduce result
```

---

## The all-reduce

```
POST /api/uploads ──► planCsv(): split rows into chunks of WORKER_CHUNK_ROWS
                                   │
                 ┌─────────────────┼─────────────────┐   chunks from every active
                 ▼                 ▼                 ▼   file compete for the pool,
            worker #1          worker #2         worker #3   highest priority first
          local reduce       local reduce       local reduce
           {sum,count}        {sum,count}        {sum,count}
                 └─────────────────┼─────────────────┘
                                   ▼
                Task.finalizeReduce(): Σ partial sums ──► single scalar
                                   │
                 pushed to the owning client (SSE) + downloadable result CSV
                 + included in the queue snapshot broadcast to ALL clients
```

The number matrix is never fully materialised — each worker parses its own row
slice, so memory stays ≈ file size regardless of column count.

## File lifecycle (the states the UI renders)

`UPLOADING → UPLOADED → QUEUED → WAITING` (has process id) `→ PROCESSING`
(completion %) `→ COMPLETED`, plus `FAILED` / `CANCELLED`. Enforced by a
transition table in `src/engine/TaskState.js`.

---

## Deadlocks — the two questions

Full analysis with code references: **[docs/DEADLOCKS.md](docs/DEADLOCKS.md)**

### 1. Which types are possible?

| Deadlock | Prevented by |
|---|---|
| **Worker-pool resource deadlock** (hold-and-wait + circular wait) | one worker held per **single chunk** then released; workers never wait on workers; stuck chunk killed + retried (pre-emption) |
| **Producer/consumer (bounded queue) deadlock** | queue never blocks — returns retryable `503 QUEUE_FULL` |
| **Priority inversion / starvation (livelock)** | **aging** promotes long-waiting low-priority tasks; queue re-heapified each guard sweep |
| **Client ↔ server response deadlock** | server never waits on a client; results go to a TTL store + SSE push |
| **Orphaned-process / cleanup deadlock** | heartbeat + stale-client sweep cancels tasks, drains chunks, frees the slot |
| **Lock-ordering deadlock** | there are **no locks** — engine state mutates synchronously on the event loop; workers are share-nothing |

### 2. How do they hurt user productivity?

Files stuck forever at *Waiting for processing* → users re-upload, amplifying
load · throughput collapses to zero while workers sit idle · low-priority teams
get no results at all during busy periods · compute wasted on abandoned jobs ·
the only fix for a wedged in-memory queue is a restart, dropping every in-flight
job · repeated stalls erode trust. **Worst case here is a retryable `503`, never
a hang.**

---

## Architecture & data structures

Full write-up: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

**Classes (OOP, one responsibility each):** `QueueEngine` (façade) · `Scheduler`
· `PriorityQueue` (binary heap) · `WorkerPool` / `InlineReducer` (interchangeable
reduce strategies) · `DeadlockGuard` · `Task` (state machine) · `Client` ·
`ClientRegistry` · `RingBuffer` · `SseHub` · `Logger`.

**Data structures:** binary min-heap priority queue (`remove` + `reheapify`) ·
hash maps for id lookups · ring buffer for recent results · finite state machine
· FIFO waiter queue in the worker pool.

**Race-free:** single Node event loop, no locks; the only parallelism is inside
share-nothing worker threads.

```
src/
├── index.js              entrypoint (npm start)
├── app.js                builds the Express app
├── config.js             env-driven config
├── engine/
│   ├── QueueEngine.js     façade
│   ├── Scheduler.js       priority queue + chunk dispatch + aging
│   ├── PriorityQueue.js   binary heap
│   ├── WorkerPool.js      worker_threads pool + watchdog
│   ├── InlineReducer.js   serverless fallback (same interface)
│   ├── DeadlockGuard.js   aging · watchdog · GC sweep
│   ├── Task.js / TaskState.js
│   ├── Client.js / ClientRegistry.js
│   └── RingBuffer.js
├── workers/reduceWorker.js
├── http/  routes.js · SseHub.js
└── util/  csv.js · Logger.js · errors.js · ids.js
```

---

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/clients` | register a client machine → `{ client }` |
| `POST` | `/api/clients/:id/heartbeat` | keep-alive |
| `DELETE` | `/api/clients/:id` | disconnect (reaps that client's tasks) |
| `POST` | `/api/uploads` | `multipart/form-data`: `file`, `clientId`, `priority` → `{ task }` or `503 QUEUE_FULL` |
| `GET` | `/api/tasks/:id` | one task's full state + history |
| `POST` | `/api/tasks/:id/cancel` | cancel (owner only) |
| `GET` | `/api/tasks/:id/result` | result summary |
| `GET` | `/api/tasks/:id/result/file` | **download the reduced value as CSV** |
| `GET` | `/api/state` | full queue snapshot (polling fallback) |
| `GET` | `/api/stream` | Server-Sent Events: `snapshot` + `notify` |
| `POST` | `/api/tick` | advance the scheduler (serverless only) |
| `GET` | `/api/health` | liveness |

---

## Deployment

**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Render blueprint (`render.yaml`)
for the stateful queue, plus `Dockerfile` for any container host. Set
`CORS_ORIGIN` to the frontend origin.

## Submission

- **Backend repo:** `Binaire_Freznel_Assessment_Backend`
- **Frontend repo:** `Binaire_Freznel_Assessment_Frontend`
- **Email subject:** `Javascript Developer - Multi-user queueing system Assessment`
- **Send to:** hr@binaire.app
