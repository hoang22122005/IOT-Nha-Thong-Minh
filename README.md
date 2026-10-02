# Smart Home IoT

This project follows the design in `PlatformIO/Projects/IOT/docs/Ke_hoach_Thiet_ke_He_thong_Smart_Home_IoT_AI_Voice.docx`.

For a beginner-friendly view of what has actually been verified and what remains, see [`docs/TIEN_DO_DU_AN.md`](docs/TIEN_DO_DU_AN.md).
For the module data format and steps to add hardware, see [`docs/KIEN_TRUC_MODULE.md`](docs/KIEN_TRUC_MODULE.md).
For the database design mapped to the Use Cases, see [`docs/THIET_KE_CSDL_THEO_USECASE.md`](docs/THIET_KE_CSDL_THEO_USECASE.md).

## How the pieces work

- ESP32 reads sensors and drives its local alarm directly.
- The ESP32 reads Wi-Fi and MQTT credentials from its ignored `include/secrets.h`. An empty `MQTT_HOST` discovers a broker on a local /24 LAN; a configured host sends data to that server. Switching the web dashboard's development mode does not change firmware already flashed onto the ESP32.
- MQTT carries sensor data and device commands between ESP32 and Spring Boot.
- Redis keeps the latest device/sensor state and uses a TTL to expire old heartbeats.
- MongoDB stores sensor history, alerts, and automation rules.
- PostgreSQL is reserved for user accounts; the `users` table is created by Flyway. Login and authorization are not implemented yet.
- Spring Boot sends live updates to the browser over WebSocket.
- React shows the Digital Twin and supports fixed Vietnamese voice commands through browser speech recognition. Full AI voice, camera and WebRTC remain later project phases.

## Start the local services

1. Follow the one-time broker/password setup in [`infra/mosquitto/README.md`](infra/mosquitto/README.md).
2. Copy `.env.example` to `.env` once on each computer. Set the MQTT password used for broker user `esp32` and a long random `POSTGRES_PASSWORD`. On the development computer, also set `BACKEND_PORT=8080` and `BACKEND_BIND_ADDRESS=127.0.0.1`; leave them unset on a VPS serving HTTP on port 80. Each computer keeps its own ignored `.env`.
3. From this folder run:

   ```powershell
   docker compose up -d
   docker compose ps
   ```

   MQTT uses port 1883 so ESP32 nodes on the trusted Wi-Fi LAN can reach it. Redis, MongoDB, and PostgreSQL bind to this computer only. PostgreSQL is available on local port 5433; backend containers use port 5432 internally.

4. Run the dashboard in a second terminal:

   ```powershell
   Set-Location .\frontend-react
   npm ci
   npm run dev
   ```

5. Create the local ESP32 credentials file from the safe template, then edit it with your own Wi-Fi and MQTT credentials:

   ```powershell
   Copy-Item .\PlatformIO\Projects\IOT\include\secrets.h.example .\PlatformIO\Projects\IOT\include\secrets.h
   ```

   `secrets.h` is ignored by Git. Never commit it or `.env`. For the ESP32 MQTT step, follow [`PlatformIO/Projects/IOT/docs/Bai_01_Node_MQTT.md`](PlatformIO/Projects/IOT/docs/Bai_01_Node_MQTT.md).
6. To understand why MQTT and WebSocket are both used, read [`PlatformIO/Projects/IOT/docs/Bai_02_Hieu_MQTT.md`](PlatformIO/Projects/IOT/docs/Bai_02_Hieu_MQTT.md) before moving on to the next hardware step.
7. When the first node is connected, follow [`PlatformIO/Projects/IOT/docs/Bai_03_Them_node_ESP32.md`](PlatformIO/Projects/IOT/docs/Bai_03_Them_node_ESP32.md) to give each additional ESP32 its own device, room, and sensor IDs.
8. Follow [`docs/Bai_04_Tu_dong_hoa_dau_tien.md`](docs/Bai_04_Tu_dong_hoa_dau_tien.md) to create and verify the first sensor-to-device automation.

## Choose a development backend

The React app calls relative `/api` and `/ws` paths, so production builds use the
same origin as the dashboard. Choose the backend with the Vite command; no React
source or production setting needs editing.

| Command (from `frontend-react`) | Dashboard | Backend used by Vite |
| --- | --- | --- |
| `npm run dev` | `http://localhost:5173` | Local Docker backend on port 8080 |
| `npm run dev:vps` | `http://localhost:5174` | VPS URL in `.env.vps.local` |

For the VPS development mode, copy `frontend-react/vps.env.example` to
`frontend-react/.env.vps.local` once and set `DEV_BACKEND_URL` to the deployed
site's HTTP origin. The file stays on your computer and is ignored by Git.
This mode uses the VPS API and WebSocket, so dashboard controls reach the live
backend and may operate real devices.

If the local backend uses a different port, set `DEV_LOCAL_BACKEND_URL` once in
the ignored `frontend-react/.env.local`. `DEV_PORT` and `DEV_HOST` can also
override the Vite port and bind address. These variables affect only the Vite
development server; `npm run build:backend` uses relative `/api` and `/ws` URLs.

Each Docker host keeps its own ignored root `.env`. The VPS can leave
`MQTT_BROKER_URL` unset to use its own Mosquitto container. To run the local
backend against the VPS broker and receive the same live ESP32 messages, set
`MQTT_BROKER_URL=tcp://<vps-host>:1883` in the **local** `.env` once, with the
matching MQTT credentials, then restart the local backend. This requires the
ESP32 to authenticate successfully with the VPS broker. The firmware's
`include/secrets.h` only affects the ESP32 after flashing; changing the web
development mode does not require reflashing it.

For a physical ESP32 that should switch brokers, copy
`PlatformIO/Projects/IOT/include/secrets.local.h.example` to the ignored
`secrets.local.h` once and enter the local Wi-Fi/MQTT credentials. From
`PlatformIO/Projects/IOT`, upload `esp32-s3-local` to use local /24 broker
discovery, or upload `esp32-s3-devkitc-1` to use the existing `secrets.h`
configuration. Changing the firmware profile requires another upload; changing
only the dashboard's Vite mode does not.

The root `.env` can also set `MQTT_HOST_PORT`, `REDIS_HOST_PORT`,
`MONGODB_HOST_PORT`, `POSTGRES_HOST_PORT`, `POSTGRES_DB`, `POSTGRES_USER`,
`MONGODB_DATABASE`, `IOT_HOME_ID`, `IOT_ROOM_ID`, `IOT_ALLOWED_ORIGINS`, and
the backend log levels. `MQTT_BIND_ADDRESS` and `BACKEND_BIND_ADDRESS` control
which host interfaces expose those services. These are optional; container-to-container addresses
and hardware pins remain fixed. Set database name/user before creating its
persistent volume; changing them later does not rename an existing database.
PlatformIO now uses its project-local default build directory instead of a
Windows `C:` path in tracked config. On Windows, if the project path contains
non-ASCII characters, copy `PlatformIO/Projects/IOT/platformio.local.ini.example`
to the ignored `platformio.local.ini` once and choose an ASCII-only build path.

## Update a VPS deployment

The backend serves the production dashboard from `backend-iot/src/main/resources/static`.
After changing React code, run `npm run build:backend` inside `frontend-react` before
committing. This builds directly into that directory and removes stale hashed assets.
Commit the source changes together with the generated `static` files. Do not commit
`.env`, `secrets.h`, or the Mosquitto password file.

On a VPS that runs this repository with `docker compose`, pull the new commit from
the project directory. For code-only changes, run `docker compose restart backend`.
When `docker-compose.yml` or the VPS `.env` changes, run
`docker compose up -d --no-deps --force-recreate backend` so the container reads
the new configuration. The backend mounts `backend-iot` from the checkout and
recompiles Java on startup. Check `docker compose logs --tail=100 backend`, then
reload the dashboard.

## Data and history

- Redis keys: `device:{deviceId}:state`, `sensor:{deviceId}:{sensorId}:current`, and `node:{deviceId}:heartbeat`. Heartbeat expires after 15 seconds without an update.
- MongoDB collections: `sensor_readings` and `alerts`.
- PostgreSQL table: `users` (email, display name, password hash, role, active flag, timestamps). It is empty until account management is implemented. Plaintext passwords must never be stored here.
- Realtime route today: MQTT → Spring Boot → Redis latest state and MongoDB history; Spring Boot then broadcasts to browsers directly over WebSocket. Redis Pub/Sub is not yet in this route. The browser does not connect to Redis.
- Sensor history API: `GET /api/iot/v1/sensors/{sensorId}/history?deviceId={deviceId}&limit=1000` (defaults to the last 24 hours; optional `from` and `to` are Unix milliseconds). The API returns at most 1000 newest readings in the chosen range.
- Device state API: `GET /api/iot/v1/devices/{deviceId}/state`.
- Automation rules are managed from the dashboard or under `/api/iot/v1/automations`. Rules can compare any named numeric measurement; this ESP32 firmware currently supports LED/buzzer actions.

Useful logs:

```powershell
docker compose logs -f backend
docker compose logs -f mqtt-broker
```

To stop the services without deleting stored data:

```powershell
docker compose down
```

## Git and local configuration

- Commit source code, documentation, dependency manifests and lockfiles.
- Keep `.env`, ESP32 `include/secrets.h`, Mosquitto `passwordfile`, generated build output, dependency directories, and local database files out of commits. These paths are covered by `.gitignore`.
- `.env.example` and `PlatformIO/Projects/IOT/include/secrets.h.example` contain placeholders for setup; replace placeholders only in the ignored local files.
- Before the first commit, review the staged file list in Fork and confirm no credentials or local data files are included.
