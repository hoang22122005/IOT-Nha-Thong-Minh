# Plan tích hợp giao diện Nhà của tôi và backend

Cập nhật: **14/10/2026**. Thiết kế gốc nằm trong [`UI_UX_IOT`](../UI_UX_IOT), gồm 6 màn hình `screen.png`, `code.html`, đặc tả UI/UX và bộ token Quiet Domestic Utility. Frontend triển khai trong `frontend-react`; không dùng script mô phỏng trong HTML thiết kế để điều khiển phần cứng.

## 1. Phạm vi đã triển khai ở frontend

| Màn hình | Chức năng nối với hệ thống hiện tại |
| --- | --- |
| Tổng quan | Đếm phòng/node từ snapshot, trạng thái WebSocket riêng với online node, cảnh báo toàn nhà, danh sách phòng, điều khiển node đang chọn, biểu đồ mẫu thật |
| Phòng & thiết bị | Tìm theo phòng/ID, lọc trạng thái node đã báo, chọn node/sensor, số đo và thời điểm mẫu, RSSI/uptime, điều khiển LED RGB/còi theo capability, thông tin kỹ thuật |
| Ngữ cảnh | Tải/tạo/sửa/xóa, thêm nhiều hành động ON/OFF cho LED/còi, kích hoạt và hiển thị số hành động được chấp nhận/đã đúng trạng thái và số lỗi |
| Tự động hóa | Tải/tạo/sửa/xóa, bật/tắt, metric tùy biến, các phép GT/GTE/LT/LTE/EQ, action khi đúng/sai, chọn không gửi lệnh khi sai, cooldown, xem trước điều kiện |
| Lịch sử cảm biến | Node/sensor/metric/range 1h/6h/24h/7d, tải lại, biểu đồ một đại lượng, bảng phân trang trong tập đã tải, thống kê mẫu, xuất CSV UTF-8 |
| Cảnh báo | Tách active/acknowledged, lọc tất cả/đang diễn ra/đã xem/đã kết thúc, ACK có kiểm tra HTTP, mở thiết bị liên quan, xuất CSV |
| Thông tin hệ thống | Trạng thái máy chủ, độ trễ browser ↔ backend, giới hạn dữ liệu và các chức năng chưa có API |

Điều hướng dùng hash URL để tải lại trực tiếp tại từng màn hình trên Spring Boot mà không cần thêm route fallback. Form ngữ cảnh/quy tắc được giữ khi chuyển trang trong cùng phiên. Giao diện có bố cục responsive và focus bàn phím; chưa xác nhận thị giác trên trình duyệt ở các kích thước do phiên công cụ hiện không có browser kết nối.

### Các nguyên tắc đã áp dụng

- Chỉ dùng dữ liệu backend cung cấp. Không tạo phòng thứ hai, số đo, đường biểu đồ, tài khoản, số bộ nhớ hoặc thời gian chạy minh họa từ ảnh.
- Khi chưa có metadata, hiển thị `Phòng {roomId}` và `deviceId`. Không tự gán `room-01` thành “Phòng khách”.
- Mất WebSocket vẫn giữ dữ liệu đã tải nhưng ghi rõ chưa cập nhật; khóa điều khiển. Node offline vẫn giữ mẫu cũ kèm thời điểm lấy mẫu của sensor.
- Heartbeat không tạo mẫu biểu đồ mới, không làm mới timestamp sensor. Giữ số đo bằng 0 và các kênh RGB bằng 0.
- Lệnh thủ công giữ trạng thái reported; khóa riêng theo `deviceId + target`; chờ trạng thái TELEMETRY mới khớp ON/OFF và RGB. Timeout 12 giây, không tự gửi lại. Đây là **đối chiếu trạng thái**, chưa phải ACK gắn với command ID.
- ACK cảnh báo không tắt còi, không clear active. Chỉ `ALERT_CLEARED` hoặc snapshot tương ứng mới kết thúc cảnh báo.
- Lịch sử có hủy request khi đổi node/sensor/range; không trộn response của lựa chọn cũ. CSV/thống kê/phân trang chỉ phản ánh tối đa 1.000 mẫu đã tải.
- Điều hòa, camera, lịch theo giờ, cấu hình ngưỡng từ xa và hồ sơ tài khoản chưa dựng thao tác hoạt động vì thiếu API/firmware.

## 2. API và sự kiện đang dùng — giữ tương thích

Base REST: `/api/iot/v1`. WebSocket: `/ws/iot/dashboard` cùng origin.

| Tác vụ | Giao tiếp đang có |
| --- | --- |
| Snapshot toàn nhà | `INIT_STATE` chứa `deviceStates[]` và `alertHistory[]` |
| Realtime | `TELEMETRY`, `DEVICE_CAPABILITIES`, `NODE_STATUS_CHANGED`, `ALERT`, `ALERT_ACK`, `ALERT_CLEARED`, `PING/PONG` |
| Điều khiển LED | `PUT /devices/light` — `{deviceId, action, r?, g?, b?}`; ON có RGB được backend đổi thành SET_COLOR |
| Điều khiển còi | `PUT /devices/buzzer` — `{deviceId, state: "ON"\|"OFF"}` |
| Đọc lại node | `GET /devices/{deviceId}/state`; hiện frontend chủ yếu lấy snapshot và realtime |
| Lịch sử | `GET /sensors/{sensorId}/history?deviceId=...&from=...&to=...&limit=1000` |
| Cảnh báo | Snapshot hoặc `GET /alerts`; `POST /alerts/{alertId}/ack` |
| Ngữ cảnh | `GET/POST /scenes`, `PUT/DELETE /scenes/{id}`, `POST /scenes/{id}/activate` |
| Tự động hóa | `GET/POST /automations`, `PUT/DELETE /automations/{id}`; bật/tắt bằng PUT toàn bộ bản ghi |

Đối chiếu implementation: `DeviceActionController`, `DashboardWebSocketHandler`, `DeviceStateService`, `AlertService`, `SceneService`, `AutomationRuleService`. “Đang kết nối máy chủ” trên frontend chỉ nói về WebSocket; không suy diễn broker MQTT, database hoặc tất cả node đang khỏe.

## 3. Backlog backend cần thực hiện

Các API từ mục này trở đi là **đề xuất, chưa triển khai**. Backend cần thống nhất contract và bổ sung kiểm thử trước khi frontend gọi.

| ID | Ưu tiên | Phần còn thiếu trong thiết kế/hệ thống | Backend cần thực hiện | Điều kiện nghiệm thu |
| --- | --- | --- | --- | --- |
| BE-01 | P0 | Snapshot có thể tạo node mặc định dù chưa từng nhận phần cứng; thiếu API danh sách độc lập WS | `GET /devices`, snapshot chỉ lấy thiết bị đã đăng ký/nhận diện; thêm `sampledAt`, `receivedAt`, `lastHeartbeatAt`, `onlineSince/offlineSince`, `snapshotAt`, `revision` | Mở nhà chưa có node trả danh sách rỗng; heartbeat không thay timestamp mẫu; reconnect khôi phục đúng danh sách |
| BE-02 | P0 | Chưa có ACK cho từng lệnh; giao diện chỉ so khớp trạng thái | Command ID và idempotency key từ REST → MQTT → firmware → backend → WS; lưu SENT/APPLIED/REJECTED/TIMED_OUT và lý do | HTTP accepted chưa là APPLIED; phản hồi muộn không cập nhật nhầm lệnh/node; không thực thi trùng khi retry |
| BE-03 | P0 | `AlertService.acknowledgeAlert` đang đổi severity thành ACKNOWLEDGED; không có ack time/actor | Giữ nguyên severity; tách `acknowledged`, `acknowledgedAt`, `acknowledgedBy`, `clearedAt`; ACK idempotent, ID không tồn tại trả 404; clear theo alert ID/event sequence | ACK vẫn active và giữ WARNING/CRITICAL; restart/reconnect giữ đúng trạng thái; clear một cảnh báo không vô tình clear bản mới |
| BE-04 | P0 trước triển khai nhiều người dùng | Chưa có auth/ownership dù có bảng users | Auth/session, mật khẩu băm, home membership/role; bảo vệ REST và WS theo nhà; hạn chế origin, ràng buộc device/sensor ownership | Người dùng nhà A không đọc/điều khiển dữ liệu nhà B; session hết hạn được xử lý rõ |
| BE-05 | P1 | “Phòng khách”, tên thiết bị, đổi tên, tạo phòng chưa lưu được | CRUD nhà/phòng/node metadata với ID ổn định, `displayName`, association, đăng ký/gỡ node | Đổi tên không sửa deviceId/MQTT topic; reload giữ tên; xóa có xử lý tham chiếu scene/rule |
| BE-06 | P1 | Form chọn sensor có thể trùng sensorId giữa node | Automation có `sourceDeviceId + sensorId + metric`; validate nguồn, đích, ownership và capability; migration cho quy tắc cũ | Hai sensor cùng ID ở hai node không kích nhầm luật; API trả lỗi rõ nếu nguồn/target không tồn tại |
| BE-07 | P1 | Lịch sử chưa đủ để tính thống kê cả 7 ngày; CSV chỉ xuất tập mẫu | API history có pagination/aggregation, coverage, total; thống kê server và export đầy đủ theo range | Tổng hợp đúng đơn vị, không gọi tối đa 1.000 điểm là toàn bộ; không mất dữ liệu khi phân trang có realtime |
| BE-08 | P1 | Ảnh có bảng cảnh báo đầy đủ, ACK lúc mấy giờ và nhật ký thao tác | Alert search/filter/pagination; audit log command/scene/rule/ACK; truy vấn theo home/device/time | Đọc được bản ghi cũ hơn 50 cảnh báo; actor/time đúng, thứ tự ổn định |
| BE-09 | P1 | Kết quả chạy scene không chỉ ra hành động nào thất bại, không có lần chạy cuối | `runId`, chi tiết từng action và commandId, accepted vs applied, run history; phát WS kết quả | Khi lỗi một phần UI chỉ ra đúng hành động; không hứa rollback hay thực thi đồng thời tuyệt đối |
| BE-10 | P1 | Thiết kế có “Thiết lập ngưỡng” nhưng firmware chưa nhận cấu hình từ API | API config với revision, validation và MQTT config ACK; xác định ưu tiên báo động cục bộ so với manual/automation | Reload thấy ngưỡng được firmware xác nhận; không ghi ngưỡng desired thành reported |
| BE-11 | P2 | Bộ nhớ rảnh, model/firmware, sức khỏe broker/database chưa có contract đáng tin | Telemetry chẩn đoán nullable và health API có nguồn/thời điểm | Field chưa được đo để null; không dùng mặc định -60 dBm/0 uptime làm dữ liệu xác thực |
| BE-12 | P2 | Lịch theo giờ, điều hòa, camera, tiết kiệm điện/nước là mở rộng | Scheduler/timezone/firmware/capability schema hoặc pipeline camera, công tơ và API tương ứng | Chỉ bật chức năng khi API + thiết bị thực hỗ trợ; có kiểm tra kết quả phần cứng |

P0 = cần giải quyết để thông tin trạng thái và kết quả điều khiển đáng tin hơn; P1 = hoàn thiện các luồng trong thiết kế; P2 = mở rộng. Frontend hiện dùng được với API cũ; các mục P0/P1 không được tính là đã hoàn tất backend trong đợt này.

## 4. Hợp đồng dữ liệu đề xuất

### 4.1. Metadata và trạng thái

```json
{
  "deviceId": "esp32-room-01",
  "homeId": "home-01",
  "roomId": "room-01",
  "displayName": "Node phòng khách",
  "roomName": "Phòng khách",
  "online": true,
  "lastHeartbeatAt": 1791900000000,
  "revision": 42,
  "sensors": {
    "dht11-01": {
      "sensorId": "dht11-01",
      "measurements": { "temperature": 30.8, "humidity": 80 },
      "units": { "temperature": "°C", "humidity": "%" },
      "sampledAt": 1791900000000,
      "receivedAt": 1791900000100
    }
  },
  "actuators": ["LED", "BUZZER"]
}
```

Ví dụ minh họa contract, không phải dữ liệu thiết bị đã xác nhận. Mọi timestamp là Unix milliseconds UTC; frontend định dạng `Asia/Ho_Chi_Minh`. Backend nên cung cấp `snapshotAt/serverTime` để xác định độ mới khi đồng hồ máy khách sai. Trường chưa có phép đo để `null`; quy định rõ thiếu field là giữ giá trị, còn null có nghĩa gì. Capabilities nên mở rộng thành action schema (RGB, enum, min/max) trước khi thêm actuator khác.

### 4.2. Command lifecycle

Đề xuất `POST /devices/{deviceId}/commands`, giữ endpoint PUT cũ trong giai đoạn chuyển tiếp:

```json
{
  "commandId": "uuid-generated-by-client",
  "target": "LED",
  "action": "SET_COLOR",
  "payload": { "r": 255, "g": 0, "b": 0 }
}
```

HTTP 202 trả `{commandId, status:"SENT", requestedAt, expiresAt}`. Firmware phản hồi command ID qua MQTT; backend phát `COMMAND_RESULT` gồm `{eventId, commandId, deviceId, target, status, reportedState, reason, appliedAt, revision}`. Trạng thái cuối chỉ do kết quả thiết bị hoặc timeout quyết định. Có `GET /commands/{commandId}` để đồng bộ lại sau reconnect. Cần thống nhất response 400/401/403/404/409/503, không trả HTTP 200 với kết quả mơ hồ. Không tự queue lệnh bật còi cũ qua lần offline/reconnect.

### 4.3. History và thống kê

Đề xuất mở rộng GET history với `metric`, `cursor`, `resolution` và response object:

```json
{
  "items": [],
  "nextCursor": null,
  "total": 0,
  "coverage": { "from": null, "to": null },
  "aggregation": { "resolution": "5m", "method": "min-max-avg" },
  "statistics": { "min": null, "max": null, "average": null, "count": 0 },
  "truncated": false
}
```

Nếu đổi array sang object, version endpoint hoặc giữ tương thích cho frontend hiện tại. Cursor dựa trên timestamp + ID để không mất/trùng các mẫu có cùng timestamp. Đưa `metric`, `unit`, `deviceId`, `sensorId`, source timezone vào export. Gắn query/filter vào response để client đối chiếu selection. Thống kê server phải tính toàn range trong query, không chỉ tập downsample.

### 4.4. Quy tắc, cảnh báo và scene

- Rule: thêm `sourceDeviceId`, `lastEvaluatedAt`, `lastMatchedAt`, `lastExecutionResult`; phân biệt cooldown với delay. Lịch giờ là loại trigger riêng có timezone. Nếu sourceDeviceId chưa có, sensorId phải duy nhất toàn hệ thống và được backend kiểm tra.
- Alert: giữ `severity: WARNING|CRITICAL`, `active`, `acknowledged` độc lập. Thêm threshold/unit/metric/sensorId do backend lưu lúc phát cảnh báo; không dùng ngưỡng hiện tại để viết lại ý nghĩa lịch sử.
- Scene run: trả `{runId, sceneId, status, actions:[{index, commandId, deviceId, target, dispatchStatus, appliedStatus, reason}]}`. Tách hành động đã đúng trạng thái từ trước với hành động vừa publish MQTT.
- Event WS: có `eventId`, `revision/sequence` và nguồn; snapshot là nguồn chuẩn để phục hồi sau mất kết nối. Frontend không phát lại lệnh đã gửi khi reconnect.

## 5. Phần mẫu thiết kế được điều chỉnh để đúng hệ thống

| Chi tiết trong ảnh | Cách triển khai hiện tại | Điều kiện để giống đầy đủ |
| --- | --- | --- |
| 2 phòng, node 2, số đo và sparkline có sẵn | Danh sách và biểu đồ từ snapshot/history; rỗng khi chưa có dữ liệu | Có node thật và history |
| Avatar/tài khoản | Dùng nút mở Cảnh báo | Auth và profile API (BE-04) |
| “MQTT active”, chu kỳ 5s, latency 14ms | Chỉ hiển thị WS connected và độ trễ PING/PONG thực | Health contract + telemetry cadence thực |
| Nhãn “Chấp thuận lệnh ngay lập tức” / ACK scene | Chờ reported state hoặc báo dispatch summary đúng API | BE-02/BE-09 |
| Bộ nhớ 174 kB, model ESP32 cố định | Không hiển thị khi backend chưa báo | BE-11 |
| Tên Phòng khách | `Phòng room-01` hoặc metadata nếu có | BE-05 |
| Nút thiết lập ngưỡng | Xem thông tin ngưỡng hiện có, không cho nhập/lưu giả | BE-10 |
| Thống kê 24h/toàn bộ 1.440 mẫu | Thống kê trên các mẫu đã tải, ghi rõ giới hạn 1.000 | BE-07 |
| ACK lúc 14:26, độ ồn 85 dB | Chỉ badge đã xem; không tạo thời điểm hoặc độ ồn | BE-03/BE-08, cảm biến âm lượng nếu cần |

## 6. Trình tự giao backend và nghiệm thu tích hợp

1. Chốt BE-01/02/03 trước: định nghĩa timestamp, reported/desired, command ID và active/ack. Duy trì endpoint cũ trong khi frontend chuyển đổi.
2. Hoàn tất auth/ownership trước khi phục vụ người dùng thật ngoài môi trường tin cậy.
3. Làm metadata và sourceDeviceId của automation; migrate quy tắc cũ; sau đó bật đổi tên/phòng trong UI.
4. Thêm pagination/statistics/export, audit và scene-run details; frontend bỏ các giới hạn fallback theo phiên bản API.
5. Bổ sung remote config và chẩn đoán khi firmware hỗ trợ. Chưa gộp camera/AI/điều hòa/điện nước vào milestone này.

### Checklist tích hợp bắt buộc

- [ ] Nhà chưa có node, chưa có sensor và các API lỗi đều có trạng thái rõ.
- [ ] Node online/offline độc lập với WebSocket; heartbeat không làm mới số đo.
- [ ] Đổi node/sensor/range lúc request chậm không trộn dữ liệu; số 0 vẫn hiển thị.
- [ ] Bật/tắt/đổi RGB nhận state đúng node; timeout, lệnh bị từ chối và phản hồi muộn được báo rõ.
- [ ] ACK cảnh báo active vẫn giữ banner và trạng thái còi; offline không tự clear.
- [ ] Rule lấy sensor từ đúng source node; cooldown và actionWhenFalse rỗng hoạt động đúng backend.
- [ ] Scene lỗi một phần chỉ ra chi tiết, không hứa rollback; không áp dụng command cũ sau reconnect.
- [ ] Phân trang và thống kê không gọi dữ liệu giới hạn là toàn bộ; CSV mở đúng tiếng Việt.
- [ ] Kiểm tra trình duyệt 390/768/1024/1440 px, zoom 200%, bàn phím và microphone thật.
- [ ] Thử ESP32 thật: LED, màu, còi, DHT11, cảnh báo, ngữ cảnh và tự động hóa.

## 7. Kiểm tra trong đợt triển khai frontend

- `npm test`: **13 kiểm tra đạt** cho normalize/heartbeat, tách sensor, ACK/clear, lịch sử, reported RGB, CSV và render các màn hình với dữ liệu rỗng/offline/0.
- `npm run build`: **đạt**, đóng gói React/Vite thành công.
- `npm run build:backend`: **đạt**, đã tạo bản production trong `backend-iot/src/main/resources/static` để Spring Boot phục vụ cùng origin.
- Các kiểm tra trên không chứng minh bố cục trình duyệt, microphone hoặc điều khiển phần cứng thật đã đạt. Chưa gửi lệnh tới ESP32 trong đợt thay giao diện này.
