# Deployment — backend

This repo is the **API service only**. The React dashboard lives in a separate
repo and is hosted on Vercel; it reaches this service over CORS.

## Recommended: Render (long-lived Node process)

A stateful queue needs a process that stays alive — so the `worker_threads`
pool, the background scheduler tick and the deadlock-guard sweep keep running,
and SSE streams stay open.

### Steps
1. Push this repo to GitHub (`Binaire_Freznel_Assessment_Backend`).
2. On Render: **New → Blueprint**, point at the repo. `render.yaml` sets:
   - build: `npm install`
   - start: `npm start`
   - health check: `/api/health`
3. After it's live, set `CORS_ORIGIN` to the deployed frontend origin
   (e.g. `https://binaire-freznel-assessment-frontend.vercel.app`) and redeploy.
4. Copy the service URL (e.g. `https://freznel-queue-backend.onrender.com`) — the
   frontend needs it as `VITE_API_BASE`.

> Render's free tier idles after ~15 min of no traffic; the first request after
> that takes a few seconds to wake. In-flight queue state is lost on idle — fine
> for a demo, expected for free hosting.

## Docker (any host: Railway, Fly.io, a VPS)

```bash
docker build -t freznel-queue-backend .
docker run -p 4000:4000 -e CORS_ORIGIN="https://your-frontend" freznel-queue-backend
curl http://localhost:4000/api/health
```

## Bare Node / local

```bash
npm install
npm start                 # http://localhost:4000
npm test                  # unit tests
npm run simulate -- --clients 10 --files 8   # load test
```

## Environment variables (all optional)

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `4000` | HTTP port |
| `CORS_ORIGIN` | `*` | allowed browser origin(s) for the frontend |
| `WORKER_POOL_SIZE` | `cpus-1` | worker threads in the reduce pool |
| `WORKER_CHUNK_ROWS` | `1500` | CSV rows per chunk |
| `WORKER_CHUNK_TIMEOUT_MS` | `15000` | watchdog: kill + retry a stuck chunk |
| `WORKER_DEMO_DELAY_MS` | `220` | artificial per-chunk delay so progress animates; `0` for raw speed |
| `QUEUE_CAPACITY` | `250` | bounded queue → `503 QUEUE_FULL` past this |
| `QUEUE_AGING_MS` | `12000` | low-priority task older than this is promoted |
| `MAX_CONCURRENT_PROCESSES` | `max(3, cpus)` | files processed concurrently |
| `RESULT_TTL_MS` | `900000` | how long a finished result stays downloadable |
| `CLIENT_STALE_MS` | `45000` | no heartbeat past this → client + tasks reaped |
| `REDUCE_STRATEGY` | `worker-pool` | set to `inline` to force the non-threaded reducer |

## Note on Vercel

The queue engine also runs as a Vercel serverless function (`config.isServerless`
swaps in an inline reducer and settles uploads in-request), but a serverless
queue can't guarantee a job survives a cold start or that two requests hit the
same instance — hence Render for the real thing.
