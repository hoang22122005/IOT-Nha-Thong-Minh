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
