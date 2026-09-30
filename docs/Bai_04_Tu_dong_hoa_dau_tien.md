# Bài 4: Tạo luật tự động đầu tiên

Trong bài này, ta cho hệ thống bật LED trên ESP32 khi độ ẩm vượt ngưỡng. Đây là bài tập để hiểu luồng automation; nó không thay thế cảnh báo nhiệt độ chạy trực tiếp trên ESP32.

## 1. Ba phần của một luật

- **Nếu**: chọn cảm biến, đại lượng đo và phép so sánh.
- **Thì**: chọn node, thiết bị và hành động khi điều kiện đúng.
- **Khi điều kiện sai trở lại**: chọn hành động đưa thiết bị về trạng thái bình thường.

Ví dụ: nếu `dht11-01` đo độ ẩm lớn hơn 75%, bật LED của `esp32-room-01`; khi độ ẩm không còn lớn hơn 75%, tắt LED.

## 2. Nhập luật trên Dashboard

Để nhìn rõ tác dụng, trước tiên xem trạng thái LED ở bảng điều khiển. Nếu LED đang bật như trạng thái hiện tại, nhấn **Tắt đèn** và đợi dashboard báo LED đã tắt. Không bật còi trong bài tập này.

Mở khu vực **Tự động hóa** và điền:

| Trường | Giá trị |
| --- | --- |
| Tên luật | `Thử độ ẩm bật LED` |
| Mã cảm biến | `dht11-01` |
| Giá trị đo | Độ ẩm (%) |
| Điều kiện | Lớn hơn (`>`) |
| Ngưỡng | `75` |
| Node điều khiển | `esp32-room-01` |
| Thiết bị | LED RGB |
| Hành động khi đúng | Bật |
| Hành động khi trở về bình thường | Tắt |
| Thời gian nghỉ | `10` giây |

Nhấn **Tạo luật**. Serial Monitor gần đây hiển thị độ ẩm khoảng 80%, nên ở lần đọc kế tiếp luật dự kiến gửi lệnh bật LED. Khi độ ẩm xuống còn 75% trở xuống, luật gửi lệnh tắt LED. Hành động đi qua Spring Boot → MQTT → ESP32; trạng thái thực tế quay về dashboard qua MQTT rồi WebSocket.

## 3. Cách kiểm tra và dừng luật

1. Xem luật xuất hiện trong danh sách và đang bật.
2. Xem Serial Monitor có báo nhận lệnh MQTT không; kiểm tra LED trên bo mạch.
3. So sánh độ ẩm với ngưỡng. Vì số đo hiện tại khoảng 80% và LED đã được tắt trước đó, luật dự kiến bật LED ở lần đọc tiếp theo. Luật chỉ gửi lệnh khi kết quả điều kiện đổi, không gửi lặp ở mỗi bản tin.
4. Sau khi thử, nhấn nút bật/tắt cạnh luật để tạm dừng, hoặc biểu tượng thùng rác để xóa. Việc dừng/xóa luật không đổi trạng thái LED hiện tại; nếu muốn khôi phục, dùng nút điều khiển LED riêng.

## 4. Nếu chưa hoạt động

- Nếu dashboard báo lỗi khi lưu, kiểm tra backend và MongoDB đang chạy.
- Nếu luật lưu nhưng LED không đổi, xác nhận node online, đúng `sensorId`/`targetDeviceId`, và Serial Monitor ghi `MQTT: connected`.
- Nếu độ ẩm thấp hơn 75%, lệnh dự kiến là tắt LED; đó là kết quả đúng của luật.
- Khi cảnh báo nhiệt độ cục bộ đang hoạt động (`>32°C`), firmware ưu tiên LED đỏ và còi tại chỗ. Không dùng bài tập này để vô hiệu hóa hoặc thay thế cảnh báo an toàn.

## Sau bài này

Automation hiện hỗ trợ so sánh nhiệt độ/độ ẩm với `>`, `>=`, `<`, `<=`, `=` và điều khiển LED/còi trên ESP32. Phần kế tiếp là tạo scene HOME/AWAY/SLEEP để gom nhiều lệnh; sau đó kiểm tra lịch sử MongoDB và tiếp tục các node/cảm biến theo danh sách phần cứng trong tài liệu thiết kế.
