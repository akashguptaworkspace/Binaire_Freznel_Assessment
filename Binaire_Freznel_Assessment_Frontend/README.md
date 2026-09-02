# Binaire · Freznel Assessment — Frontend (Live Queue Dashboard)

The **React (Vite)** dashboard for the multi-user queueing system. Every client
machine registers itself with the backend, uploads CSV files at high/low
priority, and watches the whole queue update in real time.

**Backend repo (Node.js queue server):**
<https://github.com/akashguptawebdev/Binaire_Freznel_Assessment_Backend>

---

## What's on screen

- **Client machines** — each card is a separately registered client (its own id
  + heartbeat). Add as many as you want, or open the app in another tab / on
  another computer for more real clients.
- **Upload** — drag-and-drop, multi-file, or "generate random CSV"; per-machine
  high/low **priority toggle**.
- **Per-file status** — the six lifecycle states from the brief:
  *File uploading → File uploaded → File added to queue → Waiting for processing
  (process ID) → Processing… (completion %) → Completed*, with a result download
  and a transition timeline.
- **Queue board** — waiting queue (priority + aging badges), active processes
  with live %, recently completed with the all-reduced Σ.
- **Worker rack** — live `worker_threads` pool utilisation.
- **Deadlock panel** — the analysis plus live guard counters (aging promotions,
  watchdog kicks, reaped tasks).

Realtime is **SSE** with automatic fallback to polling; against a serverless
backend it also drives the scheduler over HTTP ticks.

---

## Run locally

```bash
npm install
npm run dev            # http://localhost:5173  (proxies /api -> http://localhost:4000)
```

Start the backend repo (`npm start`) alongside it.

Point at a different backend without rebuilding:

```
http://localhost:5173/?api=https://your-backend
```

(the value is remembered in `localStorage`; there's also an in-app prompt if the
backend is unreachable)

---

## Deploy (Vercel)

1. Push this repo to GitHub (`Binaire_Freznel_Assessment_Frontend`).
2. Import it on Vercel — it auto-detects Vite (`vercel.json` is included with the
   SPA rewrite).
3. Add an environment variable **`VITE_API_BASE`** = your deployed backend URL
   (the Render service), then deploy.

---

## Structure

```
src/
├── main.jsx
├── App.jsx
├── api/client.js            axios instance + SSE URL + API-base resolution
├── hooks/
│   ├── useEngineStream.js   SSE + polling + serverless-tick fallback
│   └── useClientMachines.js local client machines (localStorage + heartbeat)
├── components/
│   ├── ClientMachineCard.jsx · UploadZone.jsx · PriorityToggle.jsx
│   ├── FileStatusCard.jsx   the 6-state stepper + progress + download
│   ├── QueueBoard.jsx · WorkerRack.jsx · DeadlockPanel.jsx
│   ├── StatBar.jsx · Header.jsx · ApiBaseBanner.jsx
├── lib/  taskState.js · format.js · csvSample.js
└── styles/app.css
```

## Submission

- **Frontend repo:** `Binaire_Freznel_Assessment_Frontend`
- **Backend repo:** `Binaire_Freznel_Assessment_Backend`
- **Email subject:** `Javascript Developer - Multi-user queueing system Assessment`
- **Send to:** hr@binaire.app
