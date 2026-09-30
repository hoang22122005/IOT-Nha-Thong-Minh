# Kiến trúc module IoT

## Luồng dữ liệu

1. ESP32 đọc cảm biến và xử lý báo động cục bộ. Báo động nhiệt độ không phụ thuộc Wi-Fi, MQTT hoặc backend.
2. ESP32 gửi telemetry qua MQTT. Broker chuyển tin tới Spring Boot.
3. Spring Boot giữ trạng thái hiện tại trong Redis, lịch sử đo và cảnh báo trong MongoDB, rồi đẩy cập nhật cho trình duyệt bằng WebSocket. PostgreSQL hiện dành cho dữ liệu người dùng.
4. Trình duyệt gửi lệnh tới REST API; backend chuyển lệnh qua MQTT. Chỉ coi lệnh là đã thực hiện khi ESP32 gửi trạng thái mới.

## Hợp đồng telemetry

Topic hiện tại: `home/{homeId}/{roomId}/sensor/{sensorId}/telemetry`.

```json
{
  "type": "TELEMETRY",
  "deviceId": "esp32-room-01",
  "sensorId": "dht11-01",
  "measurements": { "temperature": 30.5, "humidity": 72.0 },
  "units": { "temperature": "C", "humidity": "%" }
}
```

Firmware hiện vẫn gửi `temperature` và `humidity` ở cấp trên để tương thích với phần mềm cũ. Backend gom cả hai dạng thành `measurements`; module mới chỉ cần gửi dạng mới. Tên phép đo dùng chữ thường, số và `_`, bắt đầu bằng chữ, tối đa 32 ký tự. Giá trị phải là số hữu hạn. Nên dùng tên đo ổn định, ví dụ `smoke_ppm`.

ESP32 công bố các ngõ ra có thể điều khiển trên topic retained `home/{homeId}/node/{deviceId}/capabilities`. Backend lưu danh sách `actuators` vào trạng thái node. REST API mới `PUT /api/iot/v1/devices/{deviceId}/commands` chỉ nhận đích mà node đã công bố, và trả `202 SENT` khi đã chuyển lên MQTT. Nó chưa xác nhận phần cứng đã thực hiện lệnh.

## Cách thêm cảm biến

1. Chọn chân và nguồn phù hợp; ghi vào `PlatformIO/Projects/IOT/include/HardwareConfig.h`.
2. Viết một lớp đọc phần cứng riêng như `Dht11Module.h`. Giữ logic cảnh báo an toàn tại ESP32 nếu cảm biến tham gia báo động.
3. Trong firmware, thêm tên và giá trị đo vào object `measurements`, đơn vị vào `units`, với `sensorId` riêng trên topic của cảm biến đó.
4. Backend sẽ tự nhận, giữ giá trị hiện tại trong Redis, lưu lịch sử trong MongoDB và gửi qua WebSocket. Web sẽ tạo thẻ giá trị và cho chọn biểu đồ. Nếu cần luật tự động, nhập tên phép đo trong trang luật.

Ví dụ cảm biến khói có thể gửi `measurements: {"smoke_ppm": 120}` và `units: {"smoke_ppm": "ppm"}`. Quy tắc phát hiện cháy thực tế cần được thiết kế và kiểm chứng riêng; ngưỡng nhiệt độ hiện tại chỉ là demo.

## Cách thêm ngõ ra điều khiển

1. Viết mã điều khiển chân trong firmware và xử lý target mới ở `onMqttMessage`.
2. Thêm target vào `publishCapabilities()` để backend và web biết node có phần cứng đó.
3. Gửi lệnh qua API `/devices/{deviceId}/commands`; ESP32 phải gửi trạng thái đã áp dụng trở lại topic `/state`.
4. Nếu cần nút điều khiển riêng, thêm component web tương ứng. Các nút LED/còi hiện có vẫn dùng API cũ để tương thích.

## Lưu ý vận hành và mở rộng

- Lịch sử API trả tối đa 1000 bản ghi **gần nhất trong khoảng được chọn**. MongoDB có chỉ mục `(sensorId, deviceId, timestamp)` để truy vấn không phải quét toàn bộ collection. Nếu cần biểu đồ nhiều năm giữ đủ toàn khoảng thời gian, bổ sung phép tổng hợp theo khoảng tại MongoDB.
- Backend hiện chạy một instance. Trạng thái và luật tự động còn có bộ nhớ cục bộ; để chạy nhiều instance cần chuyển điều phối WebSocket và trạng thái luật sang Redis, đồng thời tránh xử lý trùng một MQTT event.
- Hàng đợi cảnh báo khi mất mạng trong ESP32 nằm ở RAM; mất điện sẽ làm mất sự kiện chưa gửi. Bản demo này chưa thay thế hệ thống báo cháy được chứng nhận.
