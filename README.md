# Smart Home IoT

This project follows the design in `PlatformIO/Projects/IOT/docs/Ke_hoach_Thiet_ke_He_thong_Smart_Home_IoT_AI_Voice.docx`.

For a beginner-friendly view of what has actually been verified and what remains, see [`docs/TIEN_DO_DU_AN.md`](docs/TIEN_DO_DU_AN.md).
For the module data format and steps to add hardware, see [`docs/KIEN_TRUC_MODULE.md`](docs/KIEN_TRUC_MODULE.md).
For the database design mapped to the Use Cases, see [`docs/THIET_KE_CSDL_THEO_USECASE.md`](docs/THIET_KE_CSDL_THEO_USECASE.md).

## How the pieces work

- ESP32 reads sensors and drives its local alarm directly.
- On the current /24 trusted Wi-Fi LAN, ESP32 finds the local Mosquitto broker by probing TCP port 1883; the broker's changing computer IP is no longer stored in firmware. Wi-Fi SSID/password are still configured in the ignored `include/secrets.h` file.
- MQTT carries sensor data and device commands between ESP32 and Spring Boot.
- Redis keeps the latest device/sensor state and uses a TTL to expire old heartbeats.
- MongoDB stores sensor history, alerts, and automation rules.
- PostgreSQL is reserved for user accounts; the `users` table is created by Flyway. Login and authorization are not implemented yet.
- Spring Boot sends live updates to the browser over WebSocket.
- React shows the Digital Twin and supports fixed Vietnamese voice commands through browser speech recognition. Full AI voice, camera and WebRTC remain later project phases.

## Start the local services

1. Follow the one-time broker/password setup in [`infra/mosquitto/README.md`](infra/mosquitto/README.md).
2. Copy `.env.example` to `.env`, set the MQTT password used for broker user `esp32`, and set a long random `POSTGRES_PASSWORD`.
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
