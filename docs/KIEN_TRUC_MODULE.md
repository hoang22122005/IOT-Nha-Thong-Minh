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

## Kiến trúc mở rộng Edge - Cloud Hybrid (Camera, Mic & AI)

Khi mở rộng hệ thống với các module đòi hỏi tính toán nặng như **Camera (Video Stream)**, **Microphone (Âm thanh/Giọng nói)** và **Mô hình AI (Nhận diện khuôn mặt, phát hiện lửa/người lạ)**, kiến trúc áp dụng mô hình **Điện toán biên kết hợp Đám mây (Edge - Cloud Hybrid Architecture)**:

```text
┌─────────────────────────────────────────────────────────────┐
│ TẠI NHÀ (EDGE / LOCAL)                                      │
│                                                             │
│  [ Camera / Mic ] ──► [ Máy tính Local / Raspberry Pi ]     │
│                              │                              │
│                      (Chạy AI xử lý tại chỗ)                 │
│                              │                              │
│     (Chỉ khi phát hiện CHÁY hoặc có NGƯỜI LẠ)               │
│                              ▼                              │
│                 Gửi bản tin JSON rất nhẹ (MQTT)             │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Internet / TCP: 1883)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ TRÊN CLOUD (VPS 168.107.75.167)                             │
│                                                             │
│  - Chạy Mosquitto Broker, Spring Boot, MongoDB, Redis       │
│  - Lưu lịch sử biến cố vào Database                         │
│  - Điều khiển thiết bị từ xa qua 4G/Internet               │
│  - Dashboard Web theo dõi tập trung                         │
└─────────────────────────────────────────────────────────────┘
```

### 1. Phân chia vai trò hai tầng

* **Tầng Biên - Tại nhà (Edge / Local Computing)**:
  - **Thu thập dữ liệu thô nặng**: Camera (ESP32-CAM, USB Webcam, RTSP IP Cam) và Microphone.
  - **Xử lý AI tại chỗ**: Tận dụng CPU/GPU của máy tính cục bộ hoặc bo mạch biên (Raspberry Pi, Jetson Nano) để chạy các mô hình AI (YOLO phát hiện lửa/khói, Face Recognition, Whisper Speech-to-Text).
  - **Nguyên tắc tiết kiệm tài nguyên**: **Không stream liên tục video độ phân giải cao lên VPS** để tránh cạn kiệt băng thông và quá tải CPU server. Khi AI phát hiện sự kiện bất thường (cháy, người lạ), Edge Node chỉ đóng gói một bản tin JSON kích thước vài trăm bytes và gửi lên Cloud qua MQTT.

* **Tầng Đám mây (Cloud Server - VPS `168.107.75.167`)**:
  - **Trung tâm điều phối**: Mosquitto Broker tiếp nhận các bản tin MQTT từ cả ESP32 và Edge Node AI.
  - **Lưu trữ & Quản lý**: Spring Boot cập nhật trạng thái thời gian thực vào Redis, ghi lại lịch sử cảnh báo/sự kiện AI vào MongoDB.
  - **Truy cập toàn cầu**: Cung cấp giao diện Web Dashboard cho phép người dùng mở điện thoại 4G từ bất cứ đâu để giám sát ngôi nhà và gửi lệnh điều khiển ngược xuống thiết bị.

### 2. Định dạng bản tin MQTT mở rộng cho AI & Voice

#### A. Cảnh báo phát hiện từ AI Vision (Lửa / Người lạ)
* **Topic**: `home/{homeId}/{roomId}/alert/ai_event`
```json
{
  "type": "AI_DETECTION",
  "source": "camera-edge-01",
  "eventType": "FIRE_DETECTED",
  "confidence": 0.94,
  "imageUrl": "http://edge-node.local/snapshots/snapshot-123.jpg",
  "message": "AI phát hiện ngọn lửa với độ tin cậy 94%",
  "timestamp": 1727870000000
}
```

#### B. Khẩu lệnh giọng nói đã bóc tách (Voice Command)
* **Topic**: `home/{homeId}/{roomId}/command/voice`
```json
{
  "type": "VOICE_COMMAND",
  "rawText": "Bật đèn phòng khách",
  "intent": "CONTROL_DEVICE",
  "target": "LED",
  "action": "ON",
  "color": "#FFFFFF",
  "timestamp": 1727870000000
}
```

### 3. Giải pháp kỹ thuật cho Video và Microphone

1. **Truyền Video thời gian thực (Live Stream)**:
   - Trong mạng nội bộ Wi-Fi (LAN): Trình duyệt xem luồng trực tiếp với độ trễ cực thấp (<100ms) qua HTTP MJPEG Stream hoặc RTSP từ Edge Device.
   - Khi ra ngoài Internet: Áp dụng công nghệ **WebRTC P2P (Peer-to-Peer)** để luồng video đi trực tiếp từ Camera về điện thoại người dùng, không cần đi qua CPU/băng thông của VPS.
2. **Kích hoạt Microphone trên Web Dashboard**:
   - Các trình duyệt hiện đại (Chrome/Edge/Safari) áp dụng chính sách bảo mật: **Chỉ cấp quyền Microphone trên kết nối an toàn (HTTPS hoặc localhost)**.
   - Để giao diện Web trên VPS (`168.107.75.167`) nhận diện được giọng nói qua trình duyệt, cần trỏ một tên miền (domain) vào IP này và cài đặt chứng chỉ SSL miễn phí (Let's Encrypt) để nâng cấp thành **`https://`**.

## Lưu ý vận hành và mở rộng

- Lịch sử API trả tối đa 1000 bản ghi **gần nhất trong khoảng được chọn**. MongoDB có chỉ mục `(sensorId, deviceId, timestamp)` để truy vấn không phải quét toàn bộ collection. Nếu cần biểu đồ nhiều năm giữ đủ toàn khoảng thời gian, bổ sung phép tổng hợp theo khoảng tại MongoDB.
- Backend hiện chạy một instance. Trạng thái và luật tự động còn có bộ nhớ cục bộ; để chạy nhiều instance cần chuyển điều phối WebSocket và trạng thái luật sang Redis, đồng thời tránh xử lý trùng một MQTT event.
- Hàng đợi cảnh báo khi mất mạng trong ESP32 nằm ở RAM; mất điện sẽ làm mất sự kiện chưa gửi. Bản demo này chưa thay thế hệ thống báo cháy được chứng nhận.

