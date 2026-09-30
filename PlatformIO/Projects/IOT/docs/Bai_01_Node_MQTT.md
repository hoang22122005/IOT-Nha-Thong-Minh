# Bài 1: ESP32 gửi dữ liệu lên MQTT

## Ta vừa ghép những gì?

- DHT11 tiếp tục đọc nhiệt độ/độ ẩm mỗi 2 giây.
- Nếu nhiệt độ vượt 33°C, ESP32 bật còi và đèn đỏ ngay tại chỗ.
- Nếu Wi-Fi và MQTT hoạt động, ESP32 gửi dữ liệu tới broker và gửi cảnh báo khi trạng thái đổi.
- ESP32 gửi heartbeat mỗi 5 giây, đồng thời lắng nghe lệnh MQTT cho LED RGB và còi.
- Sau lệnh thủ công, bo mạch báo trạng thái thực tế lại cho backend. Cảnh báo nhiệt độ tại chỗ luôn được ưu tiên.
- Mất mạng không làm dừng vòng đọc cảm biến hay còi/đèn.

33°C là ngưỡng demo hiện tại trong `src/main.cpp`. DHT11 không phát hiện khói và đây không phải thiết bị báo cháy đạt chuẩn.

## Cấu hình mạng lần đầu

1. Mở file cục bộ `include/secrets.h`. File này chứa Wi-Fi và MQTT credentials riêng của máy phát triển; không chia sẻ hoặc đưa file lên Git.
2. Điền tên/mật khẩu Wi-Fi 2.4 GHz và tài khoản/mật khẩu MQTT. ESP32 tự tìm broker trên mạng /24 hiện tại bằng cách thử cổng TCP 1883; không cần điền IP máy tính.
   - Nếu sau này đổi mật khẩu broker, cập nhật cả `.env` và `include/secrets.h`.
3. Không đưa `secrets.h` lên Git. File này đã được thêm vào `.gitignore`.
4. Máy tính và ESP32 cần cùng mạng LAN; quy tắc firewall MQTT chỉ mở cổng 1883 cho Private + LocalSubnet.
5. Bật Docker Desktop và chạy broker bằng `docker compose up -d mqtt-broker` ở thư mục dự án.
6. Chọn môi trường `esp32-s3-devkitc-1`, nạp firmware. PlatformIO tự dò cổng USB của ESP32; không chọn COM3 (đây là cổng Intel AMT trên máy hiện tại). Mở Serial Monitor ở 115200 baud.

## Topic và dữ liệu

Telemetry đi tới:

`home/home-01/room-01/sensor/dht11-01/telemetry`

Cảnh báo đi tới:

`home/home-01/room-01/alert/fire`

Topic là địa chỉ phân loại thư trong MQTT. Sau này node ở phòng khác có thể dùng `room-02` và ID thiết bị riêng.

## Kiểm tra theo từng nấc

1. Serial Monitor in được nhiệt độ/độ ẩm.
2. Khi Wi-Fi vào được mạng, Serial Monitor in `Wi-Fi connected, IP: ...`.
3. Sau đó broker chấp nhận tài khoản thì Serial Monitor in `MQTT connected`.
4. Khi đã nối backend, trạng thái cảm biến xuất hiện tại API/dashboard.
5. Khi ESP32 đã kết nối, thử nút LED/còi trên dashboard để kiểm tra lệnh đi xuống bo mạch và trạng thái quay lại.
6. Để thử còi ở ngưỡng 33°C hiện tại, làm ấm đầu cảm biến nhẹ nhàng; không chạm vật nóng trực tiếp vào cảm biến. Khi dưới ngưỡng, cảnh báo tại chỗ được gỡ.

Nếu chưa điền `secrets.h`, firmware vẫn biên dịch và báo động cục bộ; phần kết nối mạng sẽ không chạy.

## Kết quả đã xác nhận trên máy này

Trên Wi-Fi mới, ESP32-S3 nhận IP `192.168.1.156`, tự tìm broker tại `192.168.1.40:1883`, rồi in `MQTT connected` và `MQTT telemetry published`. API xác nhận node online. Quy tắc Windows Firewall cho broker chỉ cho TCP 1883 qua profile Private và nguồn LocalSubnet. Nếu lần sau MQTT không kết nối, kiểm tra broker đang chạy, hai thiết bị cùng LAN /24, Wi-Fi của Windows là Private, và router không chặn giao tiếp giữa các thiết bị.
