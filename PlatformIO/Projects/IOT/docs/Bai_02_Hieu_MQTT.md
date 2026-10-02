# Bài 2: Hiểu MQTT trong dự án này

## MQTT là gì?

Hãy tưởng tượng MQTT như một bưu điện trong mạng nhà bạn:

- **Broker** là bưu điện. Trong dự án, broker chạy bằng Mosquitto trên máy tính.
- **Topic** là địa chỉ nhận thư, ví dụ `home/home-01/room-01/sensor/dht11-01/telemetry`.
- **Publish** là gửi thư lên một topic.
- **Subscribe** là đăng ký nghe thư ở một topic.

Thiết bị gửi và nhận thông điệp thông qua broker. ESP32 không cần biết giao diện web đang mở ở đâu; backend cũng không cần kết nối trực tiếp tới từng chân GPIO.

## Theo một mẫu dữ liệu

Khi ESP32 đọc DHT11, nó tạo thông điệp có nhiệt độ, độ ẩm và trạng thái cảnh báo, rồi publish lên:

`home/home-01/room-01/sensor/dht11-01/telemetry`

Backend subscribe các topic telemetry. Khi nhận được dữ liệu, backend cập nhật trạng thái mới nhất trong Redis, lưu lịch sử vào MongoDB theo chu kỳ, rồi gửi thay đổi trực tiếp tới dashboard qua WebSocket.

Luồng dữ liệu là:

```text
DHT11 → ESP32 → MQTT broker → Spring Boot → Redis/MongoDB → WebSocket → trình duyệt
```

## Theo một lệnh điều khiển

Khi bấm bật LED trên dashboard, backend gửi lệnh tới topic:

`home/home-01/room-01/device/esp32-room-01/set`

ESP32 subscribe topic đó, nhận lệnh, đổi GPIO/LED, rồi publish trạng thái thật lên:

`home/home-01/room-01/device/esp32-room-01/state`

Đây là lý do dashboard không nên tự giả định thiết bị đã bật ngay sau khi bấm nút: thiết bị có thể đang offline. Trạng thái xác nhận cần quay lại từ ESP32.

```text
Dashboard → Spring Boot → MQTT broker → ESP32 → MQTT broker → Spring Boot → dashboard
```

## Vì sao cảnh báo vẫn kêu khi mất Internet hoặc Wi-Fi?

Quyết định báo động khi nhiệt độ vượt ngưỡng được thực hiện ngay trong `src/main.cpp` trên ESP32. ESP32 đọc cảm biến rồi bật còi/LED tại chỗ; chỉ việc gửi thông tin lên broker mới phụ thuộc mạng. Đây là phản xạ cục bộ, còn MQTT giúp các phần khác biết sự kiện đã xảy ra.

Ngưỡng 32°C hiện chỉ là ngưỡng minh họa để thử. DHT11 đo nhiệt độ và độ ẩm, không phát hiện khói và không thay thế đầu báo cháy chuyên dụng.

## MQTT không phải WebSocket

- **MQTT** nối ESP32, broker và backend để trao đổi dữ liệu/lệnh theo topic.
- **WebSocket** nối backend với dashboard trên trình duyệt để cập nhật giao diện ngay khi có sự kiện.

Hai giao thức giải quyết hai chặng khác nhau trong hệ thống; chúng không loại trừ nhau.

## Bài thực hành hiện tại

Trước tiên chỉ cần hiểu luồng ở trên. Để ESP32 tham gia vào luồng thật, file bí mật của profile đã chọn cần có Wi-Fi 2.4 GHz và đúng thông tin đăng nhập MQTT. Profile `esp32-s3-local` dùng `include/secrets.local.h` và tìm broker trên LAN /24; profile mặc định dùng `include/secrets.h` với địa chỉ broker VPS. `localhost` trên ESP32 vẫn có nghĩa là chính ESP32.

Sau khi cấu hình xong, mở Serial Monitor ở 115200 baud và kiểm tra theo thứ tự: dữ liệu DHT11 đọc được, Wi-Fi kết nối, MQTT kết nối, backend nhận telemetry, cuối cùng thử gửi lệnh từ dashboard. Nếu một bước chưa qua, xử lý bước đó trước khi đi tiếp.
