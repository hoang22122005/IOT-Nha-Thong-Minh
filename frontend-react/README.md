# Smart Home IoT dashboard

Run from this directory:

| Command | URL | API and WebSocket target |
| --- | --- | --- |
| `npm run dev` | `http://localhost:5173` | Local backend on port 8080 |
| `npm run dev:vps` | `http://localhost:5174` | `DEV_BACKEND_URL` in `.env.vps.local` |
| `npm run build:backend` | Served by Spring Boot | Relative `/api` and `/ws` paths |

To use `dev:vps`, copy `vps.env.example` to `.env.vps.local` once and enter
the VPS HTTP origin. The copied file is ignored by Git. If your local backend
uses another port, set `DEV_LOCAL_BACKEND_URL` in an ignored `.env.local`.
`DEV_PORT` and `DEV_HOST` optionally change the Vite listen address.

See the [project README](../README.md) for Docker, MQTT, ESP32, and deployment
instructions. The production build does not embed the development backend URL.

## UI and verification

The light UI follows `../UI_UX_IOT` (Quiet Domestic Utility). Use the sidebar for
Overview, Rooms & devices, Scenes, Automations, History, and Alerts. Routes use
`#/tong-quan`, `#/thiet-bi`, `#/ngu-canh`, `#/tu-dong-hoa`, `#/lich-su`, and
`#/canh-bao`, so Spring Boot does not need SPA fallback routes.

`npm test` runs state/data checks and server-render checks. `npm run build` builds
locally; `npm run build:backend` updates the tracked production assets served by
Spring Boot. Browser layout, microphone recognition, and ESP32 integration still
need real-device verification. No demo telemetry is mixed into the live app.

See [the backend handoff plan](../docs/PLAN_FRONTEND_BACKEND.md) for implemented
flows, current API contracts, and prioritized backend requirements.
