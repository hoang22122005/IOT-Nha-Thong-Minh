# Bài 1: ESP32 gửi dữ liệu lên MQTT

## Ta vừa ghép những gì?

- DHT11 tiếp tục đọc nhiệt độ/độ ẩm mỗi 2 giây.
- Nếu nhiệt độ vượt ngưỡng cấu hình hiện tại 39°C, ESP32 bật còi và đèn đỏ ngay tại chỗ.
- Nếu Wi-Fi và MQTT hoạt động, ESP32 gửi dữ liệu tới broker và gửi cảnh báo khi trạng thái đổi.
- ESP32 gửi heartbeat mỗi 5 giây, đồng thời lắng nghe lệnh MQTT cho LED RGB và còi.
- Sau lệnh thủ công, bo mạch báo trạng thái thực tế lại cho backend. Cảnh báo nhiệt độ tại chỗ luôn được ưu tiên.
- Mất mạng không làm dừng vòng đọc cảm biến hay còi/đèn.

39°C là ngưỡng demo hiện tại trong `include/HardwareConfig.h`. DHT11 không phát hiện khói và đây không phải thiết bị báo cháy đạt chuẩn.

## Cấu hình mạng lần đầu

1. Tạo `include/secrets.h` cho broker VPS, và tùy chọn tạo `include/secrets.local.h` từ mẫu tương ứng cho broker LAN. Cả hai file thật đều bị Git bỏ qua.
2. Điền tên/mật khẩu Wi-Fi 2.4 GHz và tài khoản/mật khẩu MQTT vào mỗi file một lần. Profile `esp32-s3-local` dùng `secrets.local.h` và tự tìm broker trên LAN /24. Profile `esp32-s3-devkitc-1` dùng `secrets.h` và địa chỉ broker ghi trong file đó.
   - Nếu đổi mật khẩu broker, cập nhật file bí mật của profile tương ứng và `.env` trên máy chạy broker/backend.
3. Không đưa các file bí mật lên Git.
4. Máy tính và ESP32 cần cùng mạng LAN; quy tắc firewall MQTT chỉ mở cổng 1883 cho Private + LocalSubnet.
5. Bật Docker Desktop và chạy broker bằng `docker compose up -d mqtt-broker` ở thư mục dự án.
6. Chọn `esp32-s3-local` để nạp firmware thử với broker LAN, hoặc `esp32-s3-devkitc-1` để nạp firmware dùng broker VPS. PlatformIO tự dò cổng USB của ESP32; mở Serial Monitor ở 115200 baud.

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
6. Để thử còi ở ngưỡng 39°C hiện tại, làm ấm đầu cảm biến nhẹ nhàng; không chạm vật nóng trực tiếp vào cảm biến. Khi dưới ngưỡng, cảnh báo tại chỗ được gỡ.

Nếu chưa điền `secrets.h`, profile mặc định vẫn biên dịch và báo động cục bộ; phần kết nối mạng sẽ không chạy. Profile local yêu cầu có `secrets.local.h`.

## Kết quả đã xác nhận trên máy này

Trên Wi-Fi mới, ESP32-S3 nhận IP `192.168.1.156`, tự tìm broker tại `192.168.1.40:1883`, rồi in `MQTT connected` và `MQTT telemetry published`. API xác nhận node online. Quy tắc Windows Firewall cho broker chỉ cho TCP 1883 qua profile Private và nguồn LocalSubnet. Nếu lần sau MQTT không kết nối, kiểm tra broker đang chạy, hai thiết bị cùng LAN /24, Wi-Fi của Windows là Private, và router không chặn giao tiếp giữa các thiết bị.
