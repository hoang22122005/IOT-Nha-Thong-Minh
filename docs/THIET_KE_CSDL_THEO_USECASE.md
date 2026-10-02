# Thiết kế dữ liệu theo Use Case

Tài liệu này lấy danh sách Use Case đã chốt trong `docs/IoT.txt`, đối chiếu với mã backend và các hệ đang chạy. Tài liệu use case có một danh sách UC cũ và một danh sách UC cập nhật với số thứ tự khác nhau; phần dưới gọi theo **tên nghiệp vụ** để tránh nhầm mã UC.

## 1. Nguyên tắc phân vai dữ liệu

| Thành phần   | Làm gì                                                                                   | Dữ liệu giữ ở đó                                                                       | Không dùng cho                          |
| -------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| PostgreSQL     | Nguồn dữ liệu chuẩn cho tài khoản, quyền và cấu trúc nhà                        | User, membership, home, room, đăng ký node/module                                         | Telemetry tốc độ cao                   |
| MongoDB        | Lưu hồ sơ cấu hình linh hoạt và lịch sử lâu dài                                 | Sensor readings, device events, alerts, automation rules, scenes, audit/voice/media metadata | Trạng thái heartbeat từng vài giây   |
| Redis          | Đọc nhanh trạng thái hiện tại, TTL, khóa cooldown và phát sự kiện giữa backend | Current state, heartbeat, sensor latest, active alerts, rule cooldown                        | Lịch sử lâu dài hoặc mật khẩu      |
| Mosquitto MQTT | Nhận và chuyển tiếp tin publish tới subscribers theo topic                            | Retained state cuối cùng theo topic, persistence nội bộ của broker                      | Thay thế Redis, MongoDB hoặc PostgreSQL |

Một dữ liệu chỉ có **một nơi làm nguồn chuẩn**. Ví dụ: thông tin email/tài khoản chuẩn ở PostgreSQL; lịch sử phép đo chuẩn ở MongoDB; trạng thái online hiện tại được tính theo heartbeat TTL ở Redis.

## 2. PostgreSQL — người dùng và cấu trúc nhà

Các thực thể này có quan hệ, cần ràng buộc duy nhất, kiểm tra quyền và cập nhật nhất quán. PostgreSQL phù hợp làm nguồn chuẩn cho chúng.

### Bảng đề xuất

```text
users
  id BIGINT PK
  email TEXT NOT NULL
  display_name TEXT NOT NULL
  password_hash TEXT NOT NULL
  active BOOLEAN NOT NULL DEFAULT TRUE
  created_at TIMESTAMPTZ NOT NULL
  updated_at TIMESTAMPTZ NOT NULL
  UNIQUE(lower(email))

homes
  id UUID PK
  name TEXT NOT NULL
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh'
  created_by BIGINT FK -> users.id
  created_at, updated_at TIMESTAMPTZ

home_memberships
  home_id UUID FK -> homes.id
  user_id BIGINT FK -> users.id
  role TEXT CHECK (role IN ('OWNER','ADMIN','RESIDENT','GUEST'))
  created_at TIMESTAMPTZ
  PRIMARY KEY(home_id, user_id)

rooms
  id UUID PK
  home_id UUID NOT NULL FK -> homes.id
  name TEXT NOT NULL
  room_type TEXT NULL
  created_at, updated_at TIMESTAMPTZ
  UNIQUE(home_id, name)

devices
  id TEXT PK                 -- ví dụ esp32-room-01
  home_id UUID NOT NULL FK -> homes.id
  room_id UUID NULL FK -> rooms.id
  name TEXT NOT NULL
  device_type TEXT NOT NULL  -- ESP32, VIRTUAL_CAMERA, ...
  lifecycle_status TEXT NOT NULL -- REGISTERED/PROVISIONED/ACTIVE/REVOKED
  firmware_version TEXT NULL
  registered_at TIMESTAMPTZ NOT NULL
  updated_at TIMESTAMPTZ NOT NULL

device_components
  id TEXT PK                 -- sensorId hoặc actuatorId
  device_id TEXT NOT NULL FK -> devices.id
  kind TEXT CHECK (kind IN ('SENSOR','ACTUATOR','CAMERA','MICROPHONE'))
  component_type TEXT NOT NULL -- DHT11, MQ2, LED, BUZZER, RELAY, ...
  name TEXT NOT NULL
  capabilities JSONB NOT NULL DEFAULT '{}'
  created_at, updated_at TIMESTAMPTZ
  UNIQUE(device_id, id)

user_sessions                 -- thêm khi triển khai refresh/revoke session
  id UUID PK
  user_id BIGINT NOT NULL FK -> users.id
  refresh_token_hash TEXT NOT NULL
  expires_at TIMESTAMPTZ NOT NULL
  revoked_at TIMESTAMPTZ NULL
```

### Vì sao các bảng này cần thiết?

- Quản lý `homes`, `rooms`, `devices`, `device_components` phục vụ use case quản lý không gian, ghép nối node và thêm module mới.
- `home_memberships` cho phép kiểm tra một người có quyền xem/điều khiển thiết bị trong nhà đó hay không.
- `lifecycle_status` mô tả vòng đời đăng ký/thu hồi. Trạng thái online hiện thời **không** nằm trong cột này: online là trạng thái động trong Redis.
- `device_components.capabilities` mô tả phần cứng có thể đo hoặc nhận lệnh. Giá trị đo theo thời gian không lưu ở đây.
- `user_sessions` chỉ cần khi có refresh token hoặc cần thu hồi phiên. JWT access token ngắn hạn có thể không cần lưu từng token.

Hiện migration PostgreSQL mới tạo bảng `users`. Bảng này chưa có đăng ký/đăng nhập thật, chưa có hash password từ luồng người dùng, JWT hay kiểm tra quyền ở API. Các bảng còn lại là thiết kế đề xuất, chưa được tạo trong DB.

## 3. MongoDB — cấu hình nghiệp vụ và lịch sử

MongoDB phù hợp với telemetry/event vì payload thay đổi theo từng loại cảm biến và lịch sử tăng liên tục. Các ID `homeId`, `roomId`, `deviceId`, `sensorId`, `userId` tham chiếu tới PostgreSQL; backend phải kiểm tra ID tồn tại trước khi chấp nhận cấu hình.

### `sensor_readings`

Mỗi document là một lần đo của một sensor. Tách theo sensor giúp không nhầm nhiệt độ từ DHT với một sensor nhiệt độ khác.

```json
{
  "_id": "esp32-room-01:dht11-01:1780000000000",
  "homeId": "home-01",
  "roomId": "room-01",
  "deviceId": "esp32-room-01",
  "sensorId": "dht11-01",
  "messageId": "esp32-room-01-000123",
  "schemaVersion": 1,
  "timestamp": 1780000000000,
  "measurements": { "temperature": 30.5, "humidity": 72.0 },
  "units": { "temperature": "C", "humidity": "%" }
}
```

Index chính: `{ sensorId: 1, deviceId: 1, timestamp: -1 }`; thêm `{ homeId: 1, timestamp: -1 }` nếu màn hình tổng hợp thường truy vấn theo nhà. Có thể đặt TTL cho dữ liệu rất cũ theo chính sách lưu trữ, nhưng không bật TTL khi chưa chốt thời hạn giữ lịch sử.

Mã hiện tại đã có `sensor_readings`, giữ timestamp epoch milliseconds và phép đo động; backend ghi khoảng 10 giây một lần và giới hạn mỗi truy vấn ở 1.000 mẫu mới nhất. Sau này, khi throughput lớn, cân nhắc MongoDB Time Series Collection hoặc tổng hợp theo phút/giờ để tiết kiệm dung lượng.

### `device_events`

Lưu các sự kiện cần tra cứu theo thời gian: `COMMAND_REQUESTED`, `COMMAND_ACKNOWLEDGED`, `STATE_REPORTED`, `NODE_ONLINE`, `NODE_OFFLINE`, `SCENE_ACTIVATED`, `AUTOMATION_TRIGGERED`, `DEVICE_FAULT`.

```json
{
  "_id": "event-uuid",
  "homeId": "home-01",
  "roomId": "room-01",
  "deviceId": "esp32-room-01",
  "componentId": "buzzer-01",
  "eventType": "COMMAND_ACKNOWLEDGED",
  "actor": { "kind": "USER", "userId": "42" },
  "correlationId": "command-uuid",
  "requested": { "action": "ON" },
  "reported": { "state": "ON" },
  "result": "SUCCESS",
  "occurredAt": 1780000000000
}
```

Index: `{ homeId: 1, occurredAt: -1 }`, `{ deviceId: 1, occurredAt: -1 }`, và unique `{ correlationId: 1, eventType: 1 }` nếu dùng để chống ghi nhận trùng. Lệnh yêu cầu và phản hồi thực tế là hai sự kiện khác nhau.

### `alerts`

```json
{
  "_id": "alert-uuid",
  "homeId": "home-01",
  "roomId": "room-01",
  "deviceId": "esp32-room-01",
  "sensorId": "smoke-01",
  "alertType": "SMOKE_DETECTED",
  "severity": "CRITICAL",
  "status": "ACTIVE",
  "message": "Smoke threshold exceeded",
  "trigger": { "metric": "smoke_ppm", "value": 120, "threshold": 100 },
  "triggeredAt": 1780000000000,
  "acknowledgedBy": null,
  "acknowledgedAt": null,
  "resolvedAt": null
}
```

Index: `{ homeId: 1, status: 1, triggeredAt: -1 }`, `{ deviceId: 1, triggeredAt: -1 }`. Acknowledge không xóa cảnh báo: nó ghi người nhận biết và thời điểm; resolved là một trạng thái riêng.

Hiện `alerts` có model cho cảnh báo nhiệt độ, active/acknowledged. Cần mở rộng để lưu gas, khói, intrusion, nguồn tạo cảnh báo, người xác nhận và thời điểm xử lý.

### `automation_rules`

Lưu định nghĩa luật, không lưu trạng thái cooldown đang đếm. Một luật có trigger/condition và các action linh hoạt:

```json
{
  "_id": "rule-uuid",
  "homeId": "home-01",
  "name": "Thông gió khi gas cao",
  "enabled": true,
  "trigger": { "sensorId": "mq2-01", "metric": "gas_ppm", "operator": "GTE", "value": 300 },
  "actionsWhenTrue": [{ "deviceId": "fan-01", "target": "FAN", "action": "ON" }],
  "actionsWhenFalse": [{ "deviceId": "fan-01", "target": "FAN", "action": "OFF" }],
  "cooldownSeconds": 30,
  "createdBy": "42",
  "createdAt": 1780000000000,
  "updatedAt": 1780000000000,
  "version": 1
}
```

Index: `{ homeId: 1, enabled: 1 }`; thêm `{ 'trigger.sensorId': 1, enabled: 1 }` để tìm luật liên quan sensor vừa gửi dữ liệu. Hiện model hỗ trợ một sensor/metric và một target; cấu trúc trên là hướng mở rộng nhiều actions.

### `scenes`

```json
{
  "_id": "scene-uuid",
  "homeId": "home-01",
  "name": "AWAY",
  "description": "Rời khỏi nhà",
  "actions": [
    { "deviceId": "light-01", "target": "LED", "action": "OFF" },
    { "deviceId": "alarm-01", "target": "ALARM", "action": "ARM" }
  ],
  "createdBy": "42",
  "createdAt": 1780000000000,
  "updatedAt": 1780000000000,
  "version": 1
}
```

Index: unique `{ homeId: 1, name: 1 }`. Scene configuration nằm trong MongoDB; scene đang được chọn cho một nhà là trạng thái hiện tại, có thể đặt ở Redis và ghi sự kiện đổi scene vào `device_events`.

### Multimedia và voice

- `media_events`: lưu event type, device/camera ID, thời gian và object-storage URL của snapshot/video. Không lưu byte video/audio trong document MongoDB.
- `voice_command_events` hoặc một loại `device_events`: lưu user, intent có cấu trúc, thiết bị/action đã resolve, kết quả và thời gian. Hạn chế lưu bản ghi âm/câu thoại thô; cần chính sách quyền riêng tư và thời hạn xóa.

## 4. Redis — trạng thái nóng và TTL

| Key                                         | Kiểu / nội dung       |                          TTL | Mục đích                                                                 |
| ------------------------------------------- | ----------------------- | ---------------------------: | --------------------------------------------------------------------------- |
| `devices:known`                           | Set các`deviceId`    |                   Không TTL | Khôi phục danh sách node từng đăng ký                                |
| `device:{deviceId}:state`                 | JSON trạng thái cuối |                   Không TTL | Hiện node offline vẫn có thể xem mẫu trạng thái cuối                |
| `node:{deviceId}:heartbeat`               | timestamp cuối         |                     15 giây | Online khi TTL còn; firmware gửi heartbeat mỗi 5 giây                   |
| `sensor:{deviceId}:{sensorId}:current`    | JSON phép đo cuối    |                     10 phút | Đọc nhanh giá trị hiện tại, tự hết hạn nếu sensor im lặng        |
| `alert:{alertId}:current`                 | JSON cảnh báo active  | Không TTL đến khi resolve | Phục vụ trạng thái cảnh báo đang mở                                 |
| `alerts:active:{homeId}`                  | Set alert ID đang mở  |        Đồng bộ với alert | Tải nhanh danh sách cảnh báo active theo nhà                           |
| `automation:cooldown:{ruleId}:{targetId}` | khóa/last-run token    |          cooldown của luật | Chặn lặp, hỗ trợ atomic`SET NX` khi có nhiều backend                |
| `realtime:home:{homeId}`                  | Redis Pub/Sub channel   |                  Không lưu | Tùy chọn để nhiều backend phát WebSocket event tới client của mình |

Đang có trong code: `devices:known`, `device:{id}:state`, `node:{id}:heartbeat`, `sensor:{deviceId}:{sensorId}:current`. Trạng thái cooldown và trạng thái active alert còn cần chuyển/hoàn thiện. Redis Pub/Sub chưa nằm trong luồng hiện tại; một backend đang phát WebSocket trực tiếp.

Heartbeat phải có TTL. Trạng thái device không nên TTL ngắn vì dashboard cần hiển thị node offline cùng thời điểm/giá trị cuối. Không dùng Redis làm kho lịch sử: các key current bị thay thế theo mẫu mới.

## 5. Ghép cấu trúc dữ liệu với Use Case

| Luồng Use Case                      | PostgreSQL                                               | MongoDB                                                                | Redis / MQTT                                                               |
| ------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Đăng nhập, phân quyền           | `users`, `home_memberships`, `user_sessions`       | Có thể ghi audit đăng nhập                                        | JWT kiểm tra tại backend; không đưa mật khẩu vào Redis/MQTT        |
| Nhà, phòng, ghép nối node/module | `homes`, `rooms`, `devices`, `device_components` | —                                                                     | `devices:known`; status online từ heartbeat                             |
| Telemetry, biểu đồ                | Metadata component và đơn vị chuẩn                  | `sensor_readings`                                                    | sensor current; MQTT telemetry                                             |
| Realtime dashboard                   | —                                                       | —                                                                     | Redis state; backend WebSocket trực tiếp (Redis Pub/Sub khi scale ngang) |
| Điều khiển tay/giọng nói        | Xác minh người và quyền trên home/device           | `device_events` lưu yêu cầu và kết quả                         | MQTT set/state; Redis latest reported state                                |
| Luật tự động                     | Quyền sở hữu home và device được tham chiếu      | `automation_rules`                                                   | Cooldown/idempotency; publish lệnh MQTT                                   |
| Scene                                | Quyền home/user                                         | `scenes`, event kích hoạt                                          | Scene hiện hành; các lệnh thành viên đi qua MQTT                    |
| Heartbeat/offline                    | Hồ sơ node vẫn nằm ở`devices`                     | Có thể lưu chuyển trạng thái vào event                          | MQTT heartbeat/LWT; Redis TTL                                              |
| Cảnh báo/acknowledge               | User xác nhận phải tồn tại                          | `alerts`, `device_events`                                          | Active alert cache; MQTT để truyền cảnh báo tới backend              |
| Camera/audio                         | Metadata user/quyền camera                              | Event và đường dẫn snapshot/object; không lưu luồng lớn       | WebRTC truyền luồng trực tiếp; Redis có thể lưu trạng thái phiên |
| Lịch sử/audit                      | User/role tham chiếu                                    | `sensor_readings`, `device_events`, `alerts`, voice/media events | Không dùng Redis làm lịch sử                                          |

## 6. Kiến trúc hiện có và khoảng cách với Use Case

- PostgreSQL hiện mới có bảng `users`; chưa có đăng ký/đăng nhập, RBAC, homes/rooms/devices hoặc kiểm tra JWT ở API.
- Metadata node hiện còn mặc định trong code hoặc cấu hình MQTT; chưa có quy trình onboarding/thu hồi hoàn chỉnh.
- MongoDB đang lưu `sensor_readings`, `alerts`, `automation_rules` và `scenes`; chưa có đầy đủ audit event cho lệnh, trạng thái, voice và media.
- Redis đang giữ node state, danh sách node, heartbeat TTL và latest sensor. Active alert và cooldown chưa là Redis-backed.
- WebRTC, notification gateway, AI voice tool calling và virtual camera/microphone là các Use Case tương lai; chỉ nên lưu event metadata/permissions trước khi xây media pipeline.
- MQTT broker là dịch vụ truyền tin, không phải datastore nghiệp vụ. Retained message là snapshot mới nhất của topic, không phải event history.

## 7. Thứ tự triển khai đề xuất

1. Giữ nguyên Redis/Mongo luồng telemetry hiện tại; thêm schemaVersion/messageId vào giao thức và event log để phân biệt command với reported state.
2. Dùng Flyway tạo `homes`, `home_memberships`, `rooms`, `devices`, `device_components`; thêm repository/API onboarding. Chuyển dữ liệu ID hiện đang hard-code sang cấu hình DB theo từng đợt.
3. Hoàn thiện users, hash mật khẩu, login/JWT, RBAC; mọi command phải kiểm tra quyền và thiết bị online trước khi publish.
4. Bổ sung MongoDB `device_events` và mở rộng `alerts`; triển khai acknowledge/resolved tách biệt.
5. Chuyển rule cooldown/active alert sang Redis atomic operations; chỉ khi có nhiều backend mới thêm Redis Pub/Sub và MQTT shared subscription.
6. Tạo indexes bằng migration/index initializer có kiểm soát; đặt chính sách lưu trữ/retention sau khi chốt yêu cầu dữ liệu.

Chưa nên tạo toàn bộ bảng/collection cho camera, AI và thông báo trước khi các Use Case đó được triển khai. Giữ mỗi giai đoạn nhỏ để có thể nâng cấp dữ liệu đang chạy mà không xóa lịch sử.
