# Bài 3: Thêm node ESP32 thứ hai

## Node là gì?

Trong hệ thống này, mỗi ESP32 là một **node**: một máy nhỏ đặt trong một phòng. Node đọc cảm biến và điều khiển thiết bị ở gần nó. MQTT cho phép nhiều node gửi tin nhắn tới cùng broker mà không cần nối tất cả dây đến một ESP32 duy nhất.

## Vì sao mỗi node cần ID riêng?

Backend và giao diện dùng ID để phân biệt dữ liệu. Nếu hai ESP32 cùng gửi `esp32-room-01` và `dht11-01`, hệ thống sẽ không biết bản tin thuộc node nào.

Ví dụ node ở phòng khách:

```cpp
#define IOT_DEVICE_ID "esp32-living-room"
#define IOT_HOME_ID "home-01"
#define IOT_ROOM_ID "living-room"
#define IOT_SENSOR_ID "dht11-living-room"
```

Ví dụ node ở phòng ngủ:

```cpp
#define IOT_DEVICE_ID "esp32-bedroom"
#define IOT_HOME_ID "home-01"
#define IOT_ROOM_ID "bedroom"
#define IOT_SENSOR_ID "dht11-bedroom"
```

Tên/mật khẩu Wi-Fi và MQTT nằm trong `include/secrets.h`. Mỗi node dùng chung các credentials đó, nhưng cần `IOT_DEVICE_ID`, `IOT_ROOM_ID`, `IOT_SENSOR_ID` riêng. PlatformIO có profile `esp32-s3-devkitc-1` cho node 1 và `esp32-s3-room-02` cho node 2; profile thứ hai tự đặt ID `esp32-room-02`, `room-02`, `dht11-02` khi build. Không nạp đồng thời cùng một cấu hình ID lên hai ESP32.

## Dữ liệu đi đâu?

Với node phòng khách, firmware tạo topic telemetry:

`home/home-01/living-room/sensor/dht11-living-room/telemetry`

Topic lệnh của thiết bị là:

`home/home-01/living-room/device/esp32-living-room/set`

ID trong topic được firmware ghép từ các macro. Bạn không phải tự viết topic mới cho từng phòng.

## Quy trình thêm node

1. Cắm đúng ESP32 node 2 vào máy; giữ nguyên thông tin Wi-Fi/MQTT trong `include/secrets.h`.
2. Build bằng `pio run -e esp32-s3-room-02`. Chỉ upload bằng `pio run -e esp32-s3-room-02 -t upload` khi chắc chắn đang cắm board node 2.
3. Mở Serial Monitor ở 115200 và xác nhận node đọc được cảm biến, kết nối Wi-Fi rồi MQTT.
4. Xác nhận dashboard hiển thị node `esp32-room-02` ở phòng `room-02`.
5. Với node tiếp theo, tạo profile PlatformIO khác và đảm bảo bộ ID không trùng.

Backend lưu các ID node đã biết trong Redis Set `devices:known`; trạng thái gần nhất được giữ trong Redis để node vẫn hiện trên dashboard sau khi backend khởi động lại. Một node được đánh dấu online chỉ khi heartbeat còn hạn; node mất mạng sẽ hiện offline.

Vì `secrets.h` chỉ là một file cấu hình dùng chung trên máy phát triển, hãy ghi lại bộ ID đã nạp lên từng board trong sổ tay riêng. Không ghi mật khẩu Wi-Fi hoặc MQTT cùng với danh sách ID.

## Cần nhiều cảm biến trên cùng một node?

Không phải cảm biến nào cũng dùng cùng một chân hoặc cùng giao thức. Trước khi nối thêm thiết bị, kiểm tra điện áp cấp, mức logic 3.3 V của ESP32, dòng tiêu thụ và GPIO đang dùng. Không cấp động cơ, còi công suất lớn hoặc dải LED công suất cao trực tiếp từ chân GPIO; dùng driver/transistor và nguồn phù hợp. Với nhiều phòng, thường dễ quản lý hơn nếu đặt một node ESP32 cho mỗi cụm cảm biến/thiết bị gần nhau.

## Trạng thái phần cứng hiện tại

Đã xác nhận một ESP32-S3 đọc DHT11 qua GPIO4, MQTT thật và dashboard. Profile node 2 đã có thể build riêng; chưa có board thứ hai để nạp hoặc xác nhận qua mạng.
