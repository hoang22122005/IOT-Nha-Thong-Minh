# Tiến độ hệ thống Smart Home IoT

Cập nhật: 28-09-2026. Bảng này phân biệt kết quả trên phần cứng thật với kết quả của phần mềm để không nhầm lẫn hai việc đó.

Ghi chú mạng mới: máy chạy MQTT broker chuyển sang Wi-Fi `192.168.1.40`; node 1 nhận IP `192.168.1.156`. Windows Wi-Fi mới được đặt Private để quy tắc firewall MQTT TCP 1883, phạm vi LocalSubnet, hoạt động. Firmware node 1 hiện không còn ghi cứng IP broker: nó thử cổng 1883 của các máy trong LAN /24 hiện tại, rồi dùng tài khoản MQTT để kết nối. Đã build/nạp qua COM8; Serial in `MQTT broker candidate at 192.168.1.40:1883`, `MQTT connected` và `MQTT telemetry published`; API xác nhận node online với 32.3°C/69%. Thử mDNS trên Wi-Fi này cho 0 kết quả, nên firmware dùng cách tìm bằng kết nối TCP nội bộ. Phần nhập Wi-Fi qua trang cấu hình chưa triển khai; đổi SSID/mật khẩu vẫn cần cập nhật `include/secrets.h` và nạp lại.

## Kiến trúc dữ liệu theo yêu cầu mới

```text
ESP32 (DHT11) --MQTT--> Spring Boot --ghi trạng thái mới nhất--> Redis
                                  |--ghi lịch sử cảm biến/cảnh báo--> MongoDB
                                  +--WebSocket--> Dashboard React

Tài khoản người dùng <--> Spring Boot <--> PostgreSQL
```

Redis đang giữ trạng thái mới nhất, không làm kho lịch sử. Backend hiện ghi Redis rồi tự gửi WebSocket cho trình duyệt; chưa dùng Redis Pub/Sub. Điều này đủ cho một backend. Nếu triển khai nhiều bản backend, thêm Redis Pub/Sub để chuyển sự kiện giữa các bản backend; trình duyệt vẫn chỉ kết nối WebSocket của backend. Cảnh báo còi/LED khi mất mạng vẫn do ESP32 quyết định cục bộ.

## Đã xác nhận

| Phần | Bằng chứng hiện có |
| --- | --- |
| ESP32-S3, DHT11 và MQTT thật | Sau khi tạo quy tắc firewall, broker ghi nhận client `esp32-room-01`; backend liên tục chấp nhận telemetry và heartbeat MQTT. Firmware mới nhất đã nạp thành công lên COM8; Serial Monitor sau reset thấy Wi-Fi IP `192.168.3.113`, `MQTT connected`, và DHT11 khoảng 30.8°C/80–81%. API xác nhận node online. |
| Còi | Người dùng đã xác nhận còi thử riêng hoạt động. Firmware ưu tiên báo động cục bộ khi nhiệt độ vượt 32°C. |
| Firmware cảnh báo | Bản có hàng đợi volatile tối đa 8 chuyển trạng thái cảnh báo đã được nạp thành công, flash hash được xác minh. Hàng đợi hoạt động trong RAM và không sống qua mất nguồn/reset. Firmware chỉ gọi `noTone()` sau khi còi thực sự được kích hoạt. |
| Chuẩn bị cấu hình nhiều node | Thêm profile PlatformIO `esp32-s3-room-02` với ID riêng `esp32-room-02` / `room-02` / `dht11-02`; cả profile node 1 và node 2 đều build thành công, và kiểm tra binary xác nhận mỗi profile chứa đúng bộ ID riêng. Wi-Fi/MQTT vẫn lấy từ `include/secrets.h`; ID mặc định được bảo vệ bằng `#ifndef` để profile ghi đè khi build. Chưa nạp node 2 vì hiện chỉ có board node 1. |
| Giao diện | `npm run build` thành công sau các cập nhật gần đây. |
| Điều khiển giọng nói thử nghiệm | Giao diện có khẩu lệnh tiếng Việt cố định cho LED/còi qua SpeechRecognition của trình duyệt; đã build, chưa kiểm tra microphone thực tế hay node online. Đây chưa phải trợ lý AI hội thoại. |
| Dịch vụ phần mềm | MQTT broker, Redis, MongoDB và backend Spring Boot đang chạy; Redis/MongoDB báo healthy. API danh sách scene phản hồi, hiện chưa có scene nào. |
| Luồng realtime thật | ESP32 → MQTT broker → backend đã được xác nhận bằng log nhận telemetry/heartbeat. REST trả trạng thái node online. Kết nối WebSocket thật tới `/ws/iot/dashboard` đã nhận `INIT_STATE`, sau đó nhận tiếp `TELEMETRY` với số đo của node. Dashboard dev server cũng trả HTTP 200 tại port 5173. |
| Điều khiển còi từ dashboard | Đã bấm chức năng thử còi 2 giây. Backend trả `success=true` cho lệnh ON rồi OFF, ESP32 gửi trạng thái được báo lại qua MQTT; API kết thúc với `buzzerState: false`. Đã xác nhận luồng lệnh hai chiều tới phần cứng. |
| Điều khiển LED + còi từ dashboard | Đã bấm chức năng thử kết hợp 2 giây. Dashboard nhận trạng thái còi bật rồi tắt; sau bài thử đã gửi lệnh bật LED xanh để khôi phục. API xác nhận node online, `ledState: true`, `buzzerState: false`; backend ghi nhận trạng thái báo lại qua MQTT. |
| Báo động nhiệt độ thật | DHT11 vượt ngưỡng demo 32°C; dashboard nhận cảnh báo, API báo `alertState: CRITICAL`, `ledColor: #FF0000`, `buzzerState: true`. Sau khi cảm biến nguội về 31.8°C, API báo `NORMAL`, cảnh báo chuyển `active: false`, còi tắt. ACK chỉ ghi nhận đã thấy cảnh báo; trạng thái tự xóa là sự kiện nhiệt độ hạ. |
| Lệnh chọn màu LED | Sửa backend để đổi yêu cầu `ON` có đủ RGB thành `SET_COLOR`, đúng giao thức firmware. Sau build/restart, chọn preset xanh làm API báo `ledColor: #00FF00`, `ledState: true`; màu được áp dụng thật sau khi báo động cục bộ đã clear. |
| Gửi WebSocket khi dashboard vừa kết nối | Đồng bộ hóa lần gửi `INIT_STATE` với các lần broadcast telemetry trên cùng session để tránh ghi đồng thời. Backend compile thành công và được restart; dashboard đã kết nối lại, node tiếp tục gửi dữ liệu. |
| Lịch sử cảm biến trên biểu đồ | Biểu đồ tải tối đa 1000 điểm được lấy mẫu đều trong khoảng 1 giờ, 6 giờ, 24 giờ hoặc 7 ngày từ MongoDB, rồi ghép điểm realtime WebSocket. Backend đưa `sensorId` vào trạng thái node và sự kiện telemetry để hỗ trợ đổi sensor/node. Frontend build thành công; Maven package thành công; sau khi restart backend, API state trả `sensorId: dht11-01`, `online: true`; API history xác nhận truy vấn 1 giờ/7 ngày trả dữ liệu thật; trình duyệt hiển thị các nút chọn khoảng và 91 điểm MongoDB + realtime. Dữ liệu đang có mới trải dài khoảng 52 phút, nên khoảng dài hơn chỉ hiển thị các mẫu hiện có cho tới khi tích lũy thêm. |
| Digital Twin theo phòng | Dashboard nhóm node theo `homeId/roomId`, hiển thị online/offline, nhiệt độ, độ ẩm, LED, còi và cảnh báo; bấm node chọn nó cho các bảng điều khiển. Frontend build thành công; trình duyệt đang hiển thị phòng `room-01`, node `esp32-room-01` online và số đo realtime. Chưa có node vật lý thứ hai để xác nhận nhiều phòng thật. |
| Khôi phục danh sách node từ Redis | Backend ghi ID thiết bị vào Redis Set `devices:known` và lưu trạng thái thiết bị không đặt TTL; khi khởi động, nạp các node đã biết, còn trạng thái online được quyết định bằng TTL heartbeat. Backend Maven package thành công và khởi động lại; API xác nhận node 1 online với sensor ID và số đo mới. Node 2 thật chưa có để kiểm chứng khôi phục sau khi nó từng đăng ký. |
| PostgreSQL nền tảng tài khoản | Đã thêm container PostgreSQL 17, cổng máy 5433, volume lưu bền, kết nối JDBC và Flyway. Migration V1 đã tạo bảng `users` và chỉ mục email không phân biệt chữ hoa/thường. Backend khởi động thành công; Flyway báo migration thành công và API thiết bị vẫn trả HTTP 200. Chưa có đăng ký, đăng nhập hoặc dữ liệu tài khoản. |

Ảnh chụp lúc rà soát 28-09-2026: cả 5 container `mqtt-broker`, `redis`, `mongodb`, `postgres`, `backend` đang chạy; Redis/MongoDB/PostgreSQL healthy. MongoDB có 24 bản ghi cảm biến và 1 cảnh báo, PostgreSQL có 0 người dùng. API trả `esp32-room-01` **offline**, giá trị 30.8°C/80% là mẫu cuối đã lưu, không phải phép đo trực tiếp ở thời điểm rà soát. Khóa Redis cho trạng thái node vẫn có; khóa mẫu cảm biến và heartbeat đã hết TTL. Cần kiểm tra nguồn/USB/Wi-Fi/MQTT của board trước khi thử realtime trên phần cứng.

## Chưa xác nhận hoặc chưa triển khai

| Phần | Trạng thái / bước cần làm |
| --- | --- |
| Node ESP32 thứ hai | Profile firmware riêng đã build thành công, nhưng chưa có board thứ hai để upload và xác nhận kết nối MQTT/dashboard. |
| Phát hiện khói/cháy | Chưa có cảm biến khói/khí. DHT11 chỉ đo nhiệt độ và độ ẩm; ngưỡng 32°C là minh họa, không phải đầu báo cháy. |
| Camera, WebRTC, microphone ảo và trợ lý giọng nói AI | Chưa triển khai. Đây là các giai đoạn mở rộng sau khi luồng thiết bị MQTT thật hoạt động ổn định. |
| Tài khoản và bảo vệ API/WebSocket | Bảng `users` đã có, nhưng chưa có repository/service, API đăng ký/đăng nhập, băm mật khẩu, JWT, phân quyền, hay bảo vệ WebSocket. Hiện `setAllowedOrigins("*")`; chỉ nên cho người dùng thật truy cập sau khi hoàn tất phần này. |
| Redis Pub/Sub | Chưa triển khai. Luồng hiện tại ghi Redis rồi backend đang chạy gửi WebSocket trực tiếp. Chỉ cần Pub/Sub khi nhiều backend cùng phục vụ dashboard hoặc cần tách dịch vụ nhận MQTT với dịch vụ WebSocket. |

## Bước tiếp theo

Ưu tiên tiếp theo: (1) đưa node 1 online lại và xác nhận dữ liệu mới lên dashboard; (2) xây tài khoản/đăng nhập với mật khẩu băm và bảo vệ API/WebSocket qua PostgreSQL; (3) giữ Redis làm trạng thái mới nhất, MongoDB làm lịch sử; (4) thêm Redis Pub/Sub khi cần nhiều backend; (5) thử node 2 khi có board thứ hai. DHT11 và ngưỡng 32°C chỉ là demo, không dùng làm đầu báo cháy thực tế. Trước khi upload firmware, đóng Serial Monitor đang giữ cổng COM8 nếu nó vẫn mở.
