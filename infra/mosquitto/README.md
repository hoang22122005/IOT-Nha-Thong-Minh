# MQTT broker for the Smart Home project

This runs Eclipse Mosquitto locally. The ESP32 and Spring Boot will connect to
the broker; the browser will continue receiving dashboard updates from Spring
Boot over WebSocket.

## First-time setup (PowerShell)

Run these commands from the project root. Docker Desktop must be open and show
that its engine is running.

```powershell
$configPath = (Resolve-Path '.\infra\mosquitto').Path
docker run --rm -it --mount "type=bind,source=$configPath,target=/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd -c /mosquitto/config/passwordfile esp32
docker volume create iot_mqtt-passwords
docker run --rm --user root --mount "type=bind,source=$configPath,target=/host,readonly" --mount "type=volume,source=iot_mqtt-passwords,target=/secrets" --entrypoint sh eclipse-mosquitto:2 -c "cp /host/passwordfile /secrets/passwordfile && chown 1883:1883 /secrets/passwordfile && chmod 600 /secrets/passwordfile"
docker compose up -d mqtt-broker
docker compose logs -f mqtt-broker
```

The first command asks for a password for the MQTT user `esp32`. Keep that
password private; it will be entered into the ESP32 and Spring Boot settings
later. Press Ctrl+C to leave the live broker logs while keeping the container
running.

## Quick pub/sub check

Open two PowerShell terminals in the project root. Replace `<password>` with
the password created above.

Terminal 1 (subscribe):

```powershell
docker exec -it iot-mqtt-broker mosquitto_sub -h localhost -t home/demo/room1/test -u esp32 -P '<password>' -v
```

Terminal 2 (publish):

```powershell
docker exec -it iot-mqtt-broker mosquitto_pub -h localhost -t home/demo/room1/test -m 'hello from MQTT' -u esp32 -P '<password>'
```

The first terminal should display the topic and message. This verifies the
broker before connecting the ESP32 or backend.

The `esp32-s3-local` firmware profile probes port 1883 on its current /24 Wi-Fi
LAN and uses MQTT authentication to connect. The default firmware profile uses
the broker configured in its ignored `include/secrets.h` file.
Keep the computer and ESP32 on the same trusted Private LAN; the Windows firewall
rule for TCP 1883 is limited to Private + LocalSubnet. Do not expose port 1883
to the public internet. The broker must be running before the ESP32 can find it.
