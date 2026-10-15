# Thiết kế frontend UI/UX — Nhà thông minh

Ngày biên soạn: 13/10/2026. Cơ sở đối chiếu: mã nguồn hiện có trong `backend-iot` và `frontend-react`.

Tài liệu này là đặc tả để thiết kế và triển khai lại giao diện. Các màn hình, màu sắc, kích thước và hành vi được đề xuất bên dưới chưa đồng nghĩa với việc frontend đã được sửa. Phạm vi ưu tiên là một ứng dụng web light mode dùng để theo dõi phòng, xem cảm biến và điều khiển thiết bị trong đồ án nhà thông minh.

## 1. Ý tưởng thiết kế

Giao diện mang cảm giác một bảng điều khiển trong nhà: sáng, yên tĩnh, dễ đọc và có chủ đích. Nền trắng ngà, bề mặt trắng, chữ xám đậm, một màu xanh lá trầm cho thao tác chính. Điểm nhấn nằm ở tên phòng, số đo và trạng thái thiết bị; không nằm ở hiệu ứng trang trí.

Người dùng mở ứng dụng để trả lời ba câu hỏi:

1. Phòng nào đang có vấn đề hoặc mất kết nối?
2. Nhiệt độ, độ ẩm hiện tại là bao nhiêu và dữ liệu có còn mới không?
3. Tôi vừa điều khiển thiết bị nào, và thiết bị đã báo lại trạng thái chưa?

Tên hiển thị đề xuất: **Nhà của tôi**. Dùng tên đồ án ở trang thông tin hệ thống, không đặt một khẩu hiệu công nghệ lớn ở đầu mọi màn hình.

### “Bớt AI” được hiểu thành các quyết định cụ thể

| Tránh | Thay bằng |
| --- | --- |
| Nền gradient tím/xanh, neon, glow và panel kính mờ | Nền phẳng, đường viền mảnh, bóng nhẹ chỉ khi cần phân lớp |
| Mọi khu vực đều là một card bo tròn lớn giống nhau | Phòng có thẻ riêng; thiết bị là hàng điều khiển; lịch sử dùng bảng; cảnh báo dùng banner |
| Hero “Smart Living, Powered by AI” chiếm nửa màn hình | Tiêu đề “Tổng quan” cùng trạng thái kết nối và dữ liệu thật |
| Icon nằm trong ô màu ở mọi tiêu đề | Icon nét đơn ở điều hướng và nơi cần nhận diện thiết bị |
| Số liệu giả như tiết kiệm điện, điểm an toàn, thời tiết | Chỉ hiển thị số liệu backend cung cấp; thiếu dữ liệu thì ghi rõ |
| Một trang dài chứa toàn bộ chức năng | Tách các công việc vào những trang có thứ bậc rõ |
| Chữ “Tối ưu”, “Thông minh”, “Đột phá” lặp lại | Nhãn cụ thể: “Đèn LED”, “Chưa có dữ liệu”, “Đang chờ thiết bị” |
| Chuyển động liên tục, hiệu ứng đếm số mỗi lần cập nhật | Số đo thay đổi tại chỗ, giữ ổn định bố cục |

Một giao diện có nét riêng nhờ tỷ lệ, khoảng cách, ngôn ngữ và cách xử lý trạng thái. Không cần thêm hình nhà 3D hoặc ảnh stock để tạo cảm giác hiện đại.

## 2. Phạm vi dựa trên backend

### Chức năng có thể sử dụng ngay về mặt giao tiếp phần mềm

| Chức năng | Dữ liệu/chức năng hiện có | Thiết kế tương ứng |
| --- | --- | --- |
| Danh sách node | `INIT_STATE.deviceStates` qua WebSocket | Nhóm theo `homeId` và `roomId`, đếm node online |
| Trạng thái node | REST state, telemetry, sự kiện online/offline | Nhãn kết nối, số đo, trạng thái LED/còi |
| Nhiều cảm biến | `sensors`, `measurements`, `units`, `sensorId` | Chọn cảm biến; giữ đúng đơn vị từng đại lượng |
| Điều khiển | LED, màu RGB, buzzer; API command tổng quát | Điều khiển theo capability của node |
| Lịch sử cảm biến | API theo sensor, device và khoảng thời gian | Biểu đồ, bảng dữ liệu, nhãn khoảng thực tế |
| Cảnh báo | Danh sách, ACK, sự kiện xuất hiện/clear | Banner và trang cảnh báo |
| Ngữ cảnh | CRUD scene, activate scene | Danh sách và trình tạo nhóm thao tác |
| Quy tắc tự động | CRUD automation theo phép so sánh | Form “Khi… thì…”, bật/tắt quy tắc |
| Khẩu lệnh thử nghiệm | Component frontend hiện có | Tính năng phụ trong chi tiết thiết bị |

“Có thể sử dụng” ở đây là có mã xử lý/API; tài liệu không xác nhận dịch vụ đang chạy hay phần cứng đang online tại thời điểm đọc.

### Các giới hạn phải phản ánh trong giao diện

- Điều hòa hiện trả HTTP `501`. Không dựng một bộ chỉnh nhiệt độ có vẻ hoạt động.
- Scene và automation hiện chỉ nhận target `LED` hoặc `BUZZER`, action `ON` hoặc `OFF`. Đổi màu LED thuộc điều khiển thủ công, chưa thuộc scene.
- Backend chưa có API quản lý tên phòng, sơ đồ mặt bằng, thêm/xóa node, tài khoản, đăng nhập hoặc phân quyền. Bảng `users` là nền tảng dữ liệu, không phải luồng đăng nhập đã hoàn thành.
- Chưa có API điện năng, thời tiết, camera, khóa cửa, lịch theo giờ hoặc trợ lý AI hội thoại.
- Khẩu lệnh hiện tại nhận diện câu cố định bằng frontend. Không thiết kế như chatbot và không gắn nhãn “AI Assistant”.
- Danh sách cảnh báo là tập lịch sử backend đang nạp/giữ, không có API phân trang toàn bộ kho lưu trữ.
- Chưa có nhật ký xác nhận từng lệnh với `commandId`. Trạng thái báo lại có thể khớp yêu cầu nhưng không chứng minh nguyên nhân thay đổi.

Những phần chưa có backend được ghi ở kế hoạch mở rộng, không xuất hiện dưới dạng nút thao tác trong bản chính.

## 3. Người dùng và tình huống sử dụng

| Người dùng | Công việc thường gặp | Yêu cầu UX |
| --- | --- | --- |
| Người sử dụng trong nhà | Xem trạng thái phòng, bật/tắt LED | Ít thao tác, tên dễ hiểu, phản hồi rõ |
| Sinh viên vận hành đồ án | Đổi node, xem lịch sử, tạo quy tắc | Có ID và thông tin kỹ thuật trong phần chi tiết |
| Người xem buổi bảo vệ | Theo dõi luồng cảm biến → lệnh → trạng thái | Nhìn được dữ liệu mới và kết quả thực tế |

Tên phòng giúp đọc nhanh; ID giúp đối chiếu phần cứng. Ví dụ `Phòng khách` ở dòng chính, `room-01 · esp32-room-01` ở dòng phụ. Nếu chưa có cấu hình tên, hiển thị `Phòng room-01`, không tự gán ID vào một căn phòng thực tế.

## 4. Cấu trúc điều hướng

Điều hướng desktop gồm sáu mục:

| Mục | Đường dẫn frontend đề xuất | Nội dung chính |
| --- | --- | --- |
| Tổng quan | `/` | Phòng, kết nối, cảnh báo đang diễn ra, điều khiển gần nhất |
| Phòng & thiết bị | `/rooms` | Danh sách phòng và node |
| Ngữ cảnh | `/scenes` | Tạo, sửa, chạy nhóm thao tác thủ công |
| Tự động hóa | `/automations` | Quy tắc theo giá trị cảm biến |
| Lịch sử | `/history` | Dữ liệu cảm biến theo thời gian |
| Cảnh báo | `/alerts` | Các cảnh báo backend trả về |

Chi tiết node dùng `/devices/:deviceId`. Một nút “Thông tin hệ thống” ở cuối sidebar mở panel nhỏ; chưa cần trang cài đặt lớn.

Các URL trên là route giao diện được đề xuất, không phải endpoint backend đã có.

Chỉ hiện bộ chọn nhà khi có nhiều `homeId`. Dù chỉ có một nhà, mọi phép nhóm vẫn dùng khóa `(homeId, roomId)` để tránh trộn phòng cùng ID ở hai nhà.

### Bố cục chung

- Desktop: sidebar 224 px; vùng nội dung co giãn, tối đa 1280 px; padding 32 px.
- Header nội dung: tiêu đề trái, trạng thái kết nối phải; cao tối thiểu 64 px nhưng có thể xuống dòng.
- Sidebar: tên ứng dụng, danh sách điều hướng, thông tin hệ thống. Mục đang chọn có nền xanh nhạt và chữ xanh đậm.
- Banner cảnh báo nằm ngay dưới header, trước các khối dữ liệu.
- Không đưa MQTT, Redis, MongoDB và WebSocket vào footer của mọi trang. Thông tin kiến trúc nằm trong panel hệ thống dành cho buổi trình bày.

## 5. Màn hình Tổng quan

### Thứ tự thông tin

1. Header “Tổng quan” và trạng thái kết nối trình duyệt tới backend.
2. Banner cho các cảnh báo còn active, kể cả cảnh báo ở node không được chọn.
3. Dòng tóm tắt: số phòng có node đã biết, số node online/tổng node, số cảnh báo đang diễn ra.
4. Khu vực “Các phòng”: mỗi phòng có trạng thái và đường vào thiết bị.
5. Khu vực “Điều khiển nhanh”: node đang chọn, LED và còi nếu được hỗ trợ.
6. Biểu đồ gọn cho một cảm biến đang chọn, kèm đường dẫn sang Lịch sử.
7. Tối đa ba cảnh báo gần nhất từ dữ liệu thật.

Không tính trung bình nhiệt độ toàn nhà theo mặc định. Nếu một phòng có nhiều cảm biến, hiển thị sensor đang được chọn và ghi nguồn; không chọn đại diện một cách âm thầm.

### Wireframe desktop

```text
┌────────────────┬──────────────────────────────────────────────────┐
│ Nhà của tôi    │ Tổng quan                 ● Đã kết nối máy chủ   │
│                │                                                  │
│ Tổng quan      │ [Cảnh báo đang diễn ra, nếu có]                   │
│ Phòng & TB     │                                                  │
│ Ngữ cảnh       │ 2 phòng          1/2 node online       1 cảnh báo │
│ Tự động hóa    │                                                  │
│ Lịch sử        │ Các phòng                                        │
│ Cảnh báo       │ ┌──────────────────────┐ ┌─────────────────────┐ │
│                │ │ Phòng khách          │ │ Phòng room-02       │ │
│                │ │ 30,8 °C · 80 %       │ │ Chưa có dữ liệu     │ │
│                │ │ 1 node online        │ │ 1 node offline      │ │
│                │ └──────────────────────┘ └─────────────────────┘ │
│                │                                                  │
│                │ Điều khiển · Phòng khách · esp32-room-01          │
│                │ Đèn LED       Đang bật       [công tắc]           │
│                │ Còi           Đang tắt       [công tắc]           │
│                │                                                  │
│ Thông tin HT   │ Nhiệt độ · dht11-01           [1 giờ] [Xem thêm]  │
│                │ [biểu đồ]                                        │
└────────────────┴──────────────────────────────────────────────────┘
```

Số liệu trong wireframe là ví dụ bố cục, không được đưa thành giá trị mặc định của ứng dụng. Khối phòng chiếm ưu thế thị giác, không phải một hero quảng bá.

### Thẻ phòng

- Tên phòng 18 px, số node và nhãn kết nối ở dòng phụ.
- Hai số đo chính, mỗi số có tên và đơn vị. Không có nhiệt độ/độ ẩm thì hiện đại lượng thực có.
- Nếu có node offline, ghi “1/2 node online”; không gán cả phòng là online vì chỉ một node còn kết nối.
- Nếu có cảnh báo: viền đỏ nhạt, nhãn “Có cảnh báo” và số lượng; không đổi toàn bộ nền thẻ sang đỏ đậm.
- Nút “Xem thiết bị” là đích điều hướng rõ. Nếu toàn thẻ bấm được, không đặt một công tắc tương tác lồng bên trong.
- Thứ tự phòng ổn định khi realtime cập nhật; cảnh báo thể hiện bằng nhãn/banner, không liên tục đảo vị trí.

## 6. Phòng & thiết bị và chi tiết node

Trang danh sách nhóm theo phòng, có tìm kiếm bằng tên cấu hình hoặc ID. Filter “Tất cả / Online / Offline” hoạt động trên danh sách đã nhận. Không có nút “Thêm phòng” hay “Ghép nối thiết bị” khi chưa có API hỗ trợ.

Mỗi hàng node gồm tên, ID, phòng, trạng thái online, thời điểm dữ liệu cảm biến gần nhất và nút mở chi tiết. Danh sách nhiều node dùng hàng/bảng để dễ so sánh, tránh một lưới hàng chục card lớn.

Chi tiết node gồm:

| Khu vực | Nội dung |
| --- | --- |
| Đầu trang | Breadcrumb, tên/ID, phòng, online/offline |
| Cảm biến | Chọn sensor; đại lượng, đơn vị, thời điểm mẫu |
| Điều khiển | LED/còi theo `actuators`; trạng thái báo lại và yêu cầu đang chờ |
| Giọng nói | Nút mở phần khẩu lệnh thử nghiệm |
| Lịch sử ngắn | Biểu đồ của sensor đang chọn |
| Thông tin kỹ thuật | Home/room/device/sensor ID, RSSI, uptime, capability |

`wifiRssi` và `uptimeSeconds` chỉ có giá trị trình bày khi có dữ liệu báo lại đáng tin cậy. Không dùng giá trị mặc định trong model để tạo ra một trạng thái “Wi-Fi tốt” khi node chưa từng gửi dữ liệu.

Tên thân thiện có thể nằm trong một tệp cấu hình frontend theo ID ở giai đoạn đồ án. Không tạo form “Lưu tên phòng” nếu tên chỉ tồn tại cục bộ mà người dùng không được thông báo. Sau này cần API metadata để đồng bộ tên giữa máy.

## 7. Điều khiển thiết bị và phản hồi

### Thành phần điều khiển

- Hàng LED: icon đèn, nhãn “Đèn LED”, trạng thái báo lại, công tắc.
- Phần mở rộng LED: các ô màu preset có tên “Trắng”, “Đỏ”, “Xanh lá”, “Xanh dương”; màu đang chọn có dấu kiểm và nhãn, không chỉ khác màu viền.
- Màu trắng được gửi bằng RGB `255,255,255`. Đây là LED mô hình; chưa có điều khiển độ sáng hoặc nhiệt độ màu.
- Hàng còi: nhãn “Còi”, trạng thái và công tắc. Bật còi có lời nhắc ngắn “Còi sẽ phát âm thanh tại thiết bị”, không cần modal cho mỗi lần bật.
- Không tự tạo chức năng “Thử còi 2 giây” như một bảo đảm thời gian nếu frontend chỉ gửi ON rồi hẹn OFF. Muốn thời lượng chắc chắn cần firmware hỗ trợ lệnh có thời hạn.
- Capability rỗng/chưa rõ: hiện “Chưa nhận danh sách điều khiển”; không mặc định mọi node đều có LED và còi.

### Luồng thao tác

| Trạng thái UI | Điều kiện | Hiển thị |
| --- | --- | --- |
| Sẵn sàng | Có capability, node online, dữ liệu đồng bộ | Trạng thái thiết bị và công tắc bình thường |
| Đang gửi | REST chưa trả | Khóa thao tác trên đúng target, “Đang gửi…” |
| Chờ thiết bị | Backend chấp nhận gửi lệnh | “Đã gửi lệnh bật đèn. Đang chờ thiết bị.” |
| Trạng thái đã khớp | Bản tin mới của đúng node có trạng thái mong muốn | “Thiết bị báo: đèn đang bật.” |
| Chưa xác nhận | Quá thời gian chờ đề xuất 8 giây | “Chưa nhận được trạng thái mong muốn. Kiểm tra thiết bị.” |
| Gửi thất bại | HTTP lỗi, `success:false` hoặc mất mạng | Thông báo tại hàng điều khiển, giữ trạng thái đã báo lại |

Mốc 8 giây là chính sách frontend đề xuất, có thể điều chỉnh sau thử nghiệm phần cứng; không phải timeout do API cung cấp. Một phản hồi tới muộn vẫn cập nhật trạng thái thật.

Không đổi trạng thái thực chỉ vì HTTP thành công. Có thể hiện công tắc đích ở trạng thái chờ, nhưng phải để người dùng phân biệt **đang bật** và **đã yêu cầu bật**. Nếu đích đã khớp trạng thái hiện tại, không gửi thêm lệnh chỉ để có hiệu ứng thành công.

Theo dõi yêu cầu theo `(deviceId, target)`, bao gồm trạng thái đích, thời điểm gửi và các field cần đối chiếu. Đổi phòng không làm phản hồi của node cũ hiện lên node mới. Đổi màu phải đối chiếu cả `ledState` và `ledColor`; chuẩn hóa màu trước khi so sánh.

Backend chưa có mã xác nhận lệnh. Nhãn “Trạng thái đã khớp” phản ánh việc nhận bản tin mới, không khẳng định lệnh nào tạo ra thay đổi. Không tự gửi lại lệnh khi WebSocket reconnect hoặc khi timeout.

Khi node offline hoặc WebSocket chưa nhận snapshot đồng bộ, khóa điều khiển và cho biết lý do. Có thể tiếp tục đọc lịch sử nếu REST vẫn hoạt động.

Nếu cảnh báo đang active và firmware ưu tiên báo động, hiện “Thiết bị có thể ưu tiên báo động tại chỗ”. Giao diện không được hứa tắt còi từ xa sẽ kết thúc cảnh báo.

## 8. Cảnh báo

Banner dùng nền đỏ rất nhạt, viền đỏ nhạt, icon cảnh báo và nội dung cụ thể:

> Nhiệt độ vượt ngưỡng tại Phòng khách
>
> 34,2 °C · Ngưỡng thiết bị báo: 32 °C · esp32-room-01
>
> [Đã xem cảnh báo] [Xem thiết bị]

Chỉ hiển thị ngưỡng nếu backend có `alarmThresholdC`; không lấy một số cố định từ ví dụ. Các cảnh báo nhiệt độ trong mô hình phải dùng nhãn “Nhiệt độ vượt ngưỡng”, tránh kết luận “Nhà đang cháy” chỉ từ DHT11. Có thể ghi chú gọn trong chi tiết: “Ngưỡng minh họa của đồ án”.

### Hai trạng thái độc lập

| `active` | `acknowledged` | Nhãn UX |
| --- | --- | --- |
| `true` | `false` | Đang diễn ra · Chưa xem |
| `true` | `true` | Đang diễn ra · Đã xem |
| `false` | `false` | Đã kết thúc · Chưa xem |
| `false` | `true` | Đã kết thúc · Đã xem |

ACK chỉ xác nhận người dùng đã xem. Không ẩn banner đang active, không tắt còi và không gán node về `NORMAL` vì ACK.

Backend hiện đổi `severity` thành `ACKNOWLEDGED` khi ACK. UI không dùng field này để suy ra mức nguy hiểm đã giảm; ưu tiên `active` và `acknowledged`. Nếu cần lưu mức độ ban đầu lâu dài, backend phải bổ sung field riêng. Khi thiếu dữ liệu mức độ, hiển thị “Cảnh báo đang diễn ra” thay vì tự đoán.

Nếu nhiều cảnh báo cùng lúc, banner hiển thị cảnh báo ưu tiên cùng “Còn 2 cảnh báo”; nút mở danh sách. ACK phải nhắm đúng `alertId`. `ALERT_CLEARED` chỉ kết thúc cảnh báo của `deviceId` được gửi trong event.

Trang Cảnh báo dùng các cột: thời gian, phòng/node, nội dung, đang diễn ra/đã kết thúc, đã xem/chưa xem, thao tác. Filter là lọc cục bộ tập bản ghi nhận được. Không ghi “Toàn bộ lịch sử” hoặc số tổng của database.

Nếu node mất kết nối khi cảnh báo còn active, giữ cảnh báo và ghi “Chưa nhận dữ liệu mới để xác định tình trạng hiện tại”. Mất mạng không phải một sự kiện clear.

## 9. Ngữ cảnh

Ngữ cảnh là một nhóm thao tác chạy khi người dùng bấm nút, khác với quy tắc tự động chạy khi cảm biến thay đổi.

Thẻ ngữ cảnh có tên, mô tả ngắn, danh sách hành động thu gọn và nút “Chạy”. Menu phụ gồm Sửa và Xóa. Ví dụ hợp lệ: “Tắt đèn mô hình” → LED OFF cho các node đã chọn. Không tạo sẵn ngữ cảnh có khóa cửa, điều hòa hoặc thiết bị chưa tồn tại.

Form tạo/sửa:

1. Tên ngữ cảnh, bắt buộc; mô tả, không bắt buộc.
2. Thêm ít nhất một hành động: node → LED/còi → Bật/Tắt.
3. Hiện bản xem trước bằng câu ngắn, ví dụ “Tắt đèn LED tại Phòng khách”.
4. Lưu và trả về danh sách, giữ vị trí cuộn.

Frontend yêu cầu ít nhất một hành động dù backend hiện có thể lưu scene rỗng. Giới hạn đề xuất: tên tối đa 80 ký tự, mô tả 240 ký tự. Đây là quy tắc UI đề xuất, chưa phải ràng buộc server.

Khi chạy scene, HTTP `200` và `successfulActions` không có nghĩa toàn bộ phần cứng đã hoàn thành. Backend tính cả hành động đã khớp trạng thái và lệnh gửi MQTT được, còn `failedActions` là lỗi gửi. Hiển thị:

> Backend ghi nhận 2/3 hành động đã khớp hoặc gửi được; 1 hành động gửi thất bại. Đang theo dõi trạng thái thiết bị.

Frontend theo dõi các trạng thái đích riêng. Nếu target offline, hiện cảnh báo trước khi chạy, cho người dùng chọn tiếp tục với các hành động theo đúng scene đã lưu hoặc hủy; không âm thầm bỏ hành động và gọi đó là chạy đủ scene. Scene không có rollback: có thể một phần thiết bị đã thay đổi khi phần còn lại thất bại.

## 10. Tự động hóa

Ưu tiên form diễn đạt bằng câu, không cần trình vẽ node kéo thả trong giai đoạn đồ án:

```text
Tên quy tắc       [Bật LED khi nhiệt độ cao                    ]
Khi cảm biến      [dht11-01 · Phòng khách                      ]
Đại lượng         [Nhiệt độ ▼] [Lớn hơn ▼] [31,5] °C
Thì               [esp32-room-01 ▼] [Đèn LED ▼] [Bật ▼]
Khi không thỏa    [Không gửi lệnh ▼]
Khoảng chờ        [10] giây
Kích hoạt         [công tắc]
                  [Hủy] [Lưu quy tắc]
```

### Ràng buộc form

- Bắt buộc tên, `sensorId`, `metric`, `operator`, `threshold`, `targetDeviceId`, `target`, `actionWhenTrue`.
- Metric lấy từ cảm biến thực có; ưu tiên tên dễ đọc, vẫn giữ key gốc để gửi API.
- Operator: Lớn hơn `GT`, Lớn hơn hoặc bằng `GTE`, Nhỏ hơn `LT`, Nhỏ hơn hoặc bằng `LTE`, Bằng `EQ`.
- Threshold phải là số hữu hạn; cho nhập dấu phẩy thập phân và chuyển sang số JSON. Không dùng khoảng 0–100 chung cho mọi metric.
- Target hiện chỉ `LED`, `BUZZER`; action chỉ `ON`, `OFF`.
- `actionWhenFalse` để trống hoặc null tương ứng “Không gửi lệnh”.
- `cooldownSeconds` là số nguyên từ 0 đến 86400, mặc định 10.
- `homeId`/`roomId` lấy từ ngữ cảnh đã chọn khi có; chúng không thay thế việc xác định đúng sensor.
- Backend tìm quy tắc theo `sensorId`; giai đoạn hiện tại phải dùng sensor ID duy nhất giữa các node. Nếu phát hiện trùng ID, chặn tạo quy tắc cho sensor đó và giải thích cần cấu hình lại ID hoặc nâng cấp backend.

Thêm câu xem trước: “Khi nhiệt độ dht11-01 lớn hơn 31,5 °C, bật đèn LED của esp32-room-01. Khi không thỏa, không gửi lệnh.”

Backend đánh giá quy tắc khi nhận telemetry của cảm biến; không chạy liên tục theo đồng hồ và không có lịch theo giờ. Sau lần đánh giá ban đầu, hành động phụ thuộc việc điều kiện đổi trạng thái và khoảng chờ. UI gọi `cooldownSeconds` là “Khoảng chờ giữa các lần gửi lệnh”, không gọi là trì hoãn trước khi bật thiết bị.

Danh sách hiển thị tên, câu điều kiện, node đích, trạng thái kích hoạt, sửa/xóa. Bật/tắt gửi PUT toàn bộ bản ghi kèm `enabled`; chưa có endpoint toggle riêng. Khi lỗi lưu, giữ form và trạng thái cũ. Không hiển thị “Lần chạy cuối” vì API chưa trả dữ liệu đó.

## 11. Lịch sử cảm biến

- Thanh bộ lọc: phòng/node, sensor, đại lượng, khoảng `1 giờ / 6 giờ / 24 giờ / 7 ngày`.
- Khoảng lựa chọn chuyển thành `from` và `to` Unix milliseconds; gửi cả `deviceId` để không trộn sensor giữa các node.
- API trả các mẫu mới nhất trong khoảng, tối đa 1000. Sắp tăng dần `timestamp` trước khi vẽ.
- Dùng một đại lượng trên mỗi biểu đồ. Nhiệt độ và độ ẩm có đơn vị khác nhau; nếu cần xem cùng lúc, dùng hai biểu đồ nhỏ chung trục thời gian.
- Đường nhiệt độ màu đất nung; độ ẩm màu xanh lam trầm. Nét 2 px, không gradient fill lớn, không chấm ở mọi điểm khi dữ liệu dày.
- Tooltip có thời gian, giá trị, đơn vị, sensor. Có bảng dữ liệu thay thế cho người không đọc được biểu đồ.
- Vẽ thẳng giữa các mẫu, không làm mượt khiến đường cong vượt giá trị đo.
- Khi biết có khoảng mất dữ liệu, tách đoạn đường; không nối xuyên một quãng offline dài như thể có dữ liệu liên tục.
- Đổi node/sensor/khoảng thời gian phải hủy hoặc bỏ kết quả request cũ; không chớp dữ liệu node trước sang node mới.
- Ghép realtime chỉ khi event có giá trị đại lượng của đúng sensor. Heartbeat không có số đo không tạo một điểm cảm biến mới.
- Loại trùng bằng khóa `(deviceId, sensorId, timestamp)`; lịch sử dài phải có giới hạn điểm lưu trên trình duyệt.

Nếu chọn 7 ngày nhưng 1000 mẫu chỉ phủ 2 giờ, ghi “Hiển thị 1000 mẫu gần nhất trong khoảng đã chọn · Dữ liệu từ … đến …”. Không tuyên bố đang xem đầy đủ 7 ngày và không tính min/max cho cả tuần từ tập mẫu giới hạn.

Empty state: “Chưa có bản ghi trong khoảng này. Thử khoảng thời gian khác.” Lỗi HTTP: “Không tải được lịch sử” cùng nút Thử lại. Backend hiện có thể trả mảng rỗng khi truy vấn storage lỗi; frontend không phân biệt được trường hợp này với không có dữ liệu. Muốn thông báo chính xác cần backend trả lỗi hoặc metadata trạng thái truy vấn.

## 12. Điều khiển giọng nói

Giữ ở phần phụ của chi tiết node, tên “Khẩu lệnh thử nghiệm”. Chỉ mở micro sau thao tác chủ động, có nút “Dừng nghe”. Hiện rõ node đang nhận lệnh.

Luồng UI: Sẵn sàng → Đang nghe → Hiện câu nghe được → Đang gửi → Chờ trạng thái thiết bị. Các khẩu lệnh ví dụ lấy từ chức năng đã xử lý: “bật đèn”, “tắt đèn”, “bật đèn đỏ”, “bật còi”, “tắt còi”.

Parser hiện thao tác node đang chọn; chưa phân tích tên phòng để định tuyến. Nhãn hướng dẫn phải nói rõ “Lệnh áp dụng cho thiết bị đang chọn”. Không quảng bá câu “Bật đèn phòng ngủ” như một cơ chế chọn phòng tự động đã có.

Không hỗ trợ nhận diện hoặc chưa cấp quyền micro thì hiển thị nguyên nhân và các nút điều khiển thủ công ngay cạnh. Lệnh giọng nói tuân thủ cùng pending/offline/capability như thao tác tay. Đổi node trong lúc nghe thì dừng phiên nghe để tránh gửi nhầm.

## 13. Hệ thống màu và kiểu chữ

### Màu light mode

| Token | Giá trị | Mục đích |
| --- | --- | --- |
| `--bg-app` | `#F6F7F4` | Nền ứng dụng trắng ngà |
| `--bg-surface` | `#FFFFFF` | Bề mặt nội dung |
| `--bg-subtle` | `#EEF1EC` | Hover, vùng phụ |
| `--text-primary` | `#202923` | Tiêu đề và nội dung chính |
| `--text-secondary` | `#566159` | Chú thích vẫn cần đọc rõ |
| `--border-default` | `#DDE3DC` | Phân vùng, viền card |
| `--border-control` | `#7B897F` | Viền input/công tắc cần nhận diện |
| `--accent` | `#276749` | Nút chính, mục đang chọn, focus |
| `--accent-hover` | `#1E5239` | Hover nút chính |
| `--accent-soft` | `#E7F0E9` | Nền nhãn xanh |
| `--warning-text` | `#80530E` | Cảnh báo cần chú ý |
| `--warning-bg` | `#FFF5DF` | Nền cảnh báo |
| `--danger-text` | `#B42318` | Lỗi/cảnh báo đang diễn ra |
| `--danger-bg` | `#FEF0ED` | Nền lỗi/cảnh báo |
| `--chart-temperature` | `#A64B2A` | Đường nhiệt độ |
| `--chart-humidity` | `#2B6A91` | Đường độ ẩm |

Màu xanh dùng cho thao tác và online nhưng luôn kèm chữ/icon để phân biệt ý nghĩa. Đỏ dành cho lỗi, cảnh báo và hành động xóa; không dùng đỏ như màu trang trí nhiệt độ khi chưa có cảnh báo.

### Typography, khoảng cách và bề mặt

- Font mặc định: `"Segoe UI", system-ui, -apple-system, sans-serif`; ưu tiên hiển thị tiếng Việt rõ và không phụ thuộc tải font mạng.
- Body 15–16 px, line-height 1.5; nhãn phụ 13 px; tránh chữ dưới 12 px.
- Tiêu đề trang 28 px/600; tiêu đề khu vực 18 px/600; tên thiết bị 15–16 px/600.
- Số đo chính 32 px/600; đơn vị 16 px/400. Dùng `font-variant-numeric: tabular-nums` để số cập nhật không làm xô lệch hàng.
- Scale khoảng cách: 4, 8, 12, 16, 24, 32, 48 px. Padding card 20–24 px; khoảng cách hàng 12–16 px.
- Bán kính: control 8 px, card 12 px, dialog 16 px. Chỉ dùng pill cho badge nhỏ.
- Card thông thường dùng viền 1 px, không cần bóng. Dialog/dropdown có thể dùng `0 8px 24px rgba(32, 41, 35, 0.08)`.
- Icon dùng hệ `lucide-react` đã có trong codebase, một độ dày nét, kích thước 18–20 px. Không trộn emoji, icon 3D và outline.
- Chuyển cảnh hover/focus 120–180 ms; không nhảy card khi hover, không animate số realtime.

### CSS nền tảng đề xuất

```css
:root {
  color-scheme: light;
  --bg-app: #f6f7f4;
  --bg-surface: #fff;
  --text-primary: #202923;
  --text-secondary: #566159;
  --border-default: #dde3dc;
  --border-control: #7b897f;
  --accent: #276749;
  --accent-soft: #e7f0e9;
  --radius-control: 8px;
  --radius-card: 12px;
}

body {
  margin: 0;
  background: var(--bg-app);
  color: var(--text-primary);
  font: 16px/1.5 "Segoe UI", system-ui, sans-serif;
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.sensor-value {
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

Đây là khung token, chưa phải stylesheet hoàn chỉnh. Khi triển khai cần kiểm tra từng tổ hợp màu của text, icon, input, focus và trạng thái disabled.

## 14. Component và trạng thái

| Component | Quy định |
| --- | --- |
| Nút chính | Một thao tác chính mỗi vùng; nền xanh, chữ trắng; cao 40–44 px |
| Nút phụ | Nền trắng, viền control, chữ đậm; không cạnh tranh với CTA chính |
| Nút icon | Tên truy cập rõ, vùng bấm tối thiểu 44 × 44 px |
| Công tắc | Tên thiết bị, trạng thái chữ, checked và pending riêng; không chỉ dùng màu |
| Input/select | Label luôn hiện; lỗi sát field; mô tả đơn vị và giới hạn |
| Badge trạng thái | Online, Offline, Chờ phản hồi, Đang diễn ra, Đã xem; icon/chữ đi kèm |
| Toast | Phản hồi ngắn cho lưu/xóa; không thay banner cảnh báo hoặc lỗi field |
| Dialog | Dùng khi tạo/sửa ngắn hoặc xác nhận xóa; có Hủy và thao tác đích cụ thể |
| Skeleton | Giữ đúng hình khối nội dung; chỉ dùng lúc tải đầu |
| Empty state | Một câu mô tả và một bước có ích; không dùng hình minh họa lớn |
| Lỗi tải | Giữ dữ liệu cũ nếu có, đánh dấu chưa mới, có Thử lại |

Không hiện spinner toàn trang mỗi lần telemetry tới. Bản tin realtime không lấy focus, không đóng dialog và không xóa bản nháp form.

Xóa scene/quy tắc cần dialog có tên đối tượng, ví dụ “Xóa quy tắc ‘Bật LED khi nhiệt độ cao’?”. Không tạo thao tác xóa node vì chưa có API.

## 15. Responsive và khả năng truy cập

| Chiều rộng thiết kế | Bố cục |
| --- | --- |
| Từ 1200 px | Sidebar 224 px, lưới phòng tối đa 3 cột, nội dung 2 cột nếu cần |
| 768–1199 px | Sidebar thu gọn hoặc drawer, lưới 2 cột, khu vực điều khiển đủ rộng |
| Dưới 768 px | Header gọn, nội dung 1 cột, padding 16 px, điều hướng dưới |

Mobile có thanh dưới: Tổng quan, Thiết bị, Cảnh báo, Thêm. “Thêm” mở Ngữ cảnh, Tự động hóa, Lịch sử và Thông tin hệ thống. Thanh dưới chừa vùng safe area; nội dung có padding cuối để không bị che.

Form mobile mở toàn màn hình thay vì một dialog nhỏ giữa trang. Bảng cảnh báo chuyển thành hàng xếp dọc; biểu đồ cho phép cuộn khu vực bên trong nếu cần, không làm toàn trang tràn ngang.

Yêu cầu nghiệm thu khả năng truy cập:

- Contrast mục tiêu: chữ thường tối thiểu 4,5:1; chữ lớn và phần điều khiển cần nhận diện tối thiểu 3:1. Đây là mục tiêu thiết kế cần đo khi triển khai.
- Tất cả thao tác dùng được bằng bàn phím; focus nhìn rõ; dialog giữ focus và trả focus về nút mở sau khi đóng.
- Control chạm tối thiểu 44 × 44 px; không đặt nút xóa sát công tắc.
- Label gắn đúng input; switch có tên và trạng thái; icon trang trí ẩn khỏi trình đọc màn hình.
- Lỗi form có text, không chỉ viền đỏ; trường lỗi được liên kết với mô tả lỗi.
- Cảnh báo mới dùng thông báo truy cập thích hợp; không đọc lại mọi số đo mỗi vài giây.
- Biểu đồ có bảng dữ liệu hoặc phần mô tả; tooltip không là nơi duy nhất chứa đơn vị.
- Zoom 200% vẫn dùng được; reduced motion được tôn trọng.

## 16. Hợp đồng REST cho frontend

Base path: `/api/iot/v1`. Dùng URL tương đối theo thiết lập frontend hiện có. Không đưa địa chỉ VPS hoặc thông tin MQTT vào UI người dùng.

| Method và endpoint | Mục đích | Lưu ý xử lý |
| --- | --- | --- |
| `GET /devices/{deviceId}/state` | Snapshot một node | Có thể trả state mặc định cho ID chưa biết; HTTP 200 không chứng minh node đã kết nối |
| `PUT /devices/{deviceId}/commands` | Gửi lệnh cho target được quảng bá | `202` là đã gửi; `400` target/action không hợp lệ hoặc không có capability; `503` broker lỗi |
| `PUT /devices/light` | API LED tương thích hiện có | Kiểm tra `success` trong JSON dù HTTP 200; ON có RGB được dịch thành SET_COLOR |
| `PUT /devices/buzzer` | API còi tương thích hiện có | Body dùng `state`, không phải `action`; kiểm tra `success` |
| `PUT /devices/air-conditioner` | Chưa triển khai phần cứng | HTTP 501; không đưa vào điều khiển chính |
| `GET /sensors/{sensorId}/history` | Lịch sử một sensor | Query `deviceId`, `from`, `to`, `limit`; mặc định 24 giờ, limit mặc định 200, tối đa 1000 |
| `GET /alerts` | Tập cảnh báo backend đang giữ | Chưa có phân trang/filter phía server |
| `POST /alerts/{alertId}/ack` | Đánh dấu đã xem | Không clear; handler hiện vẫn trả success kể cả khi ID không tìm thấy |
| `GET`, `POST /scenes` | Danh sách/tạo scene | Tạo thành công 201; validation lỗi trả `{error}` |
| `PUT`, `DELETE /scenes/{id}` | Sửa/xóa scene | DELETE 204 hoặc 404; PUT gửi toàn bộ đối tượng cần giữ |
| `POST /scenes/{id}/activate` | Chạy scene | 200 kèm số hành động; 404 nếu không tìm thấy |
| `GET`, `POST /automations` | Danh sách/tạo rule | Tạo thành công 201; validation lỗi trả `{error}` |
| `PUT`, `DELETE /automations/{id}` | Sửa/xóa rule | Không có PATCH/toggle riêng; DELETE 204 hoặc 404 |

UI chuẩn hóa thông báo tiếng Việt, không chỉ in nguyên chuỗi lỗi tiếng Anh. Giữ nội dung kỹ thuật gốc ở phần chi tiết lỗi khi cần. Không gọi `response.json()` với response 204. PUT scene/rule chưa bảo đảm ID tồn tại; nếu stale ID tạo thành bản ghi mới theo service hiện tại, nên tải lại danh sách và cần cải thiện backend trước luồng sửa đồng thời nghiêm ngặt.

### Ví dụ lệnh tổng quát

```http
PUT /api/iot/v1/devices/esp32-room-01/commands
Content-Type: application/json
```

```json
{
  "type": "COMMAND",
  "target": "LED",
  "action": "SET_COLOR",
  "r": 255,
  "g": 255,
  "b": 255
}
```

Chỉ dùng action firmware hỗ trợ cho target tương ứng. Capability hiện chỉ công bố danh sách target, chưa có schema các action hợp lệ. Không suy ra một actuator mới có thể dùng công tắc ON/OFF nếu chưa có định nghĩa điều khiển.

### Ví dụ quy tắc hợp lệ

```json
{
  "name": "Bật LED khi nhiệt độ cao",
  "homeId": "home-01",
  "roomId": "room-01",
  "sensorId": "dht11-01",
  "metric": "temperature",
  "operator": "GT",
  "threshold": 31.5,
  "targetDeviceId": "esp32-room-01",
  "target": "LED",
  "actionWhenTrue": "ON",
  "actionWhenFalse": null,
  "enabled": true,
  "cooldownSeconds": 10
}
```

### Ví dụ ngữ cảnh hợp lệ

```json
{
  "name": "Tắt đèn mô hình",
  "description": "Tắt LED tại node phòng đang thử nghiệm",
  "homeId": "home-01",
  "actions": [
    {
      "targetDeviceId": "esp32-room-01",
      "target": "LED",
      "action": "OFF"
    }
  ]
}
```

Các ID ở ví dụ phải được thay bằng ID trong dữ liệu thực khi người dùng tạo đối tượng.

## 17. WebSocket và chuẩn hóa dữ liệu

Endpoint: `/ws/iot/dashboard`. Đây là WebSocket JSON trực tiếp, không phải giao thức STOMP. Trình duyệt dùng `ws` hoặc `wss` tương ứng origin. Lệnh thiết bị và ACK đi qua REST.

| Event | Xử lý frontend |
| --- | --- |
| `INIT_STATE` | Nạp `deviceStates`, `deviceState` tương thích và `alertHistory`; xác lập snapshot sau reconnect |
| `TELEMETRY` | Merge đúng node/sensor; cập nhật trạng thái báo lại và chỉ thêm điểm chart khi có số đo |
| `DEVICE_CAPABILITIES` | Cập nhật `homeId`, `roomId`, `actuators` của node; tái tính điều khiển khả dụng |
| `NODE_STATUS_CHANGED` | Cập nhật online của đúng node; không đổi thời điểm mẫu cảm biến |
| `ALERT` | Upsert theo `alertId`, giữ nhiều cảnh báo active |
| `ALERT_ACK` | Chỉ đổi acknowledged của đúng alert; giữ active |
| `ALERT_CLEARED` | Đánh dấu active false cho cảnh báo của đúng device; không ảnh hưởng node khác |
| `SCENE_ACTIVATED` | Thông báo scene đã được backend xử lý gửi lệnh; chưa xác nhận thiết bị hoàn thành |
| `PONG` | Phản hồi PING; nếu hiển thị độ trễ, ghi rõ độ trễ trình duyệt ↔ backend |

### Quy tắc dữ liệu bắt buộc

1. Snapshot có `ledState`, `buzzerState` kiểu boolean; telemetry dùng chuỗi `ON`/`OFF`. Chuẩn hóa thành boolean hoặc unknown, không dùng `Boolean("OFF")`.
2. Snapshot có `alertState`; telemetry dùng `fireDanger`. Chuẩn hóa thành một trường nội bộ riêng, không dùng nó thay cho `active` của từng cảnh báo.
3. Telemetry hiện không luôn mang `homeId`/`roomId`. Giữ context từ snapshot/capability; node mới chưa đủ context có thể ở nhóm “Chưa xác định phòng” rồi tải state riêng, không gán theo node đang chọn.
4. Field null hoặc vắng trong partial event không được xóa số đo trước. Tuy nhiên số đo giữ lại phải có thời điểm mẫu cũ; không gọi nó là mẫu mới.
5. Ưu tiên dữ liệu theo `sensors[sensorId]` cho màn hình một cảm biến. `measurements` cấp node có thể chứa giá trị gộp từ nhiều sensor, không là nguồn duy nhất để xác định nguồn đo.
6. `lastSeenAt` cấp node có thể thay đổi vì heartbeat/status. Thời điểm mẫu phải lấy từ sensor hoặc event thực chứa metric; không dùng mọi heartbeat để ghi “Nhiệt độ vừa cập nhật”.
7. Model có giá trị mặc định LED, màu, RSSI và uptime. Nếu chưa có bằng chứng báo lại, dùng “Chưa xác định” cho trạng thái phần cứng thay vì trình bày các mặc định như số liệu thật.
8. Không tự thêm điểm 0 khi giá trị thiếu. Giá trị 0 hợp lệ phải được giữ, không dùng kiểm tra truthy để quyết định có dữ liệu.
9. `INIT_STATE` có thể đến sát các broadcast khác. Trong lúc chờ init, đệm event; sau khi nạp snapshot, áp dụng event mới theo node/sensor và thời điểm. Không để snapshot cũ ghi đè một trạng thái vừa nhận.

### Kết nối và reconnect

Tách hai trạng thái: **kết nối trình duyệt → backend** và **node online/offline**. WebSocket mở không chứng minh ESP32 online hoặc MQTT hoạt động.

Reconnect đề xuất: 1, 2, 4, 8 giây rồi giới hạn 15 giây, thêm dao động nhỏ để tránh nhiều client kết nối đồng thời. Khi socket mất, đánh dấu “Đang kết nối lại”, giữ snapshot cũ dưới nhãn “Dữ liệu gần nhất”, khóa điều khiển cho tới khi đồng bộ lại.

Sau reconnect, nhận `INIT_STATE`, tải lại scene và automation vì CRUD hai loại này chưa có event đồng bộ danh sách. Trong một phiên mở lâu, có nút tải lại danh sách và tải lại khi quay lại trang sau thay đổi ở nơi khác.

Backend hiện kiểm tra node quá 10 giây không có bản tin theo chu kỳ 3 giây; Redis heartbeat có TTL 15 giây dùng khi phục hồi state. UI lấy trạng thái backend báo, không áp một timeout riêng để cố làm hai mốc này giống nhau. Độ mới của mẫu cảm biến vẫn là thông tin riêng.

## 18. Nội dung và cách viết trên giao diện

Giọng văn ngắn, trực tiếp, nói rõ đối tượng và hành động. Dùng tiếng Việt thống nhất, chỉ giữ ID và thuật ngữ kỹ thuật trong chi tiết.

| Tình huống | Nội dung đề xuất |
| --- | --- |
| Chưa nhận snapshot | “Đang tải trạng thái nhà…” |
| Chưa có node đã nhận diện | “Chưa nhận được thiết bị. Kết nối ESP32 để bắt đầu.” |
| Node mặc định chưa có bản tin | “Chưa nhận dữ liệu từ esp32-room-01.” |
| Node offline có số đo cũ | “Thiết bị offline · Mẫu cảm biến lúc 14:32:10” |
| Máy chủ mất kết nối | “Mất kết nối máy chủ. Đang thử kết nối lại.” |
| Không có sensor | “Node này chưa gửi dữ liệu cảm biến.” |
| Không có capability | “Chưa nhận danh sách thiết bị có thể điều khiển.” |
| Đang chờ lệnh | “Đã gửi lệnh. Đang chờ thiết bị báo trạng thái.” |
| Lưu quy tắc | “Đã lưu quy tắc.” |
| Scene chưa có | “Chưa có ngữ cảnh. Tạo nhóm thao tác để chạy cùng lúc.” |
| Không có cảnh báo trong tập hiện có | “Không có cảnh báo trong dữ liệu đã tải.” |
| ACK thành công | “Đã đánh dấu cảnh báo là đã xem.” |

Định dạng số theo `vi-VN`: `30,8 °C`, `80 %`. Timestamp hiển thị theo múi giờ ứng dụng; mặc định đồ án là `Asia/Ho_Chi_Minh`, ghi rõ múi giờ ở Lịch sử. Các nhãn tương đối như “12 giây trước” cần có thời gian đầy đủ trong tooltip hoặc phần chi tiết.

Không ghi “Mọi thứ đều an toàn” khi dữ liệu offline, thiếu sensor hoặc chưa nhận snapshot. Trạng thái phù hợp là “Không có cảnh báo đang diễn ra trong dữ liệu hiện có”.

## 19. Hướng tổ chức frontend hiện có

Có thể giữ React, Vite, Chart.js và Lucide đang nằm trong `frontend-react`. Ưu tiên tổ chức lại component, dữ liệu và token trước khi bổ sung thư viện.

```text
src/
  app/             # shell, điều hướng, context chọn nhà/node/sensor
  pages/           # Overview, Rooms, DeviceDetail, Scenes, Automations,
                   # History, Alerts
  components/ui/   # Button, Badge, Switch, Field, Dialog, EmptyState
  features/
    devices/       # RoomCard, DeviceRow, ActuatorControl
    telemetry/     # SensorMetric, SensorPicker, HistoryChart
    alerts/        # ActiveAlertBanner, AlertList
    scenes/        # SceneList, SceneForm
    automations/   # RuleList, RuleForm
  services/        # REST client, WebSocket client
  state/           # normalized device/sensor/alert state, pending commands
  config/          # tên thân thiện theo ID, định nghĩa actuator đã biết
  styles/          # tokens, nền tảng, layout
```

Sơ đồ trên là cấu trúc đề xuất. Các component hiện tại có thể chuyển tiếp như sau:

| Component hiện có | Hướng sử dụng |
| --- | --- |
| `Header` | Header gọn, trạng thái browser/backend tách node |
| `HomeDigitalTwin` | Danh sách phòng/nút chọn node có dữ liệu thật; không cần mặt bằng giả |
| `MetricsGrid` | Số đo theo sensor đang chọn và độ mới của từng mẫu |
| `ControlPanel` | Điều khiển theo capability, pending theo target |
| `FireAlertBanner` | Banner nhiều node, ACK không ẩn cảnh báo active |
| `TelemetryChart` | Lịch sử có giới hạn mẫu, xử lý đổi sensor và request cũ |
| `ScenePanel`, `AutomationPanel` | Chuyển thành trang riêng, form dễ đọc |
| `VoiceCommandPanel` | Khối thử nghiệm trong chi tiết node |
| `ActivityLog` | Cảnh báo từ backend; hoạt động phiên cục bộ phải ghi nhãn riêng |
| `useIoTWebSocket` | Tách normalize/merge, quản lý kết nối và state theo ID |

CSS hiện tại sử dụng dark mode, glass panel, glow và gradient. Việc chuyển sang light mode cần thay toàn bộ nền tảng màu và các inline color; đổi riêng màu nền body sẽ không tạo được giao diện nhất quán.

Không sửa hoặc tạo dữ liệu để lấp chỗ trống trong bản dùng thật. Nếu cần dữ liệu demo phục vụ trình bày, phải có chế độ tách biệt với nhãn “Dữ liệu mô phỏng”, không gửi lệnh tới node thật.

## 20. Trình tự triển khai và nghiệm thu

### Thứ tự thực hiện

1. Thiết lập token light mode, app shell và component cơ bản.
2. Chuẩn hóa snapshot/realtime; tách kết nối backend, node online và thời điểm mẫu.
3. Hoàn thiện Tổng quan, Phòng & thiết bị và chi tiết node.
4. Hoàn thiện pending command, offline, capability và phản hồi lỗi.
5. Hoàn thiện cảnh báo với active/ack độc lập.
6. Chuyển scene và automation sang các trang/form riêng.
7. Hoàn thiện lịch sử, giới hạn mẫu, dữ liệu thiếu và biểu đồ responsive.
8. Kiểm tra khẩu lệnh, khả năng truy cập và luồng trình diễn.

### Checklist thị giác

- [ ] Light mode nhất quán cả dialog, dropdown, chart và trạng thái lỗi.
- [ ] Không còn nền neon/gradient, glow hay kính mờ từ theme cũ.
- [ ] Bố cục có phân cấp; không biến mọi hàng thông tin thành card giống nhau.
- [ ] Tên phòng, trạng thái và điều khiển đọc được nhanh trên mobile.
- [ ] Một font, một hệ icon, spacing và radius thống nhất.
- [ ] Không có số liệu hoặc thiết bị trang trí thiếu nguồn backend.
- [ ] Các bố cục được kiểm tra ở 390, 768, 1024 và 1440 px, cùng zoom 200%.

### Checklist hành vi

- [ ] Node chưa có bản tin không hiện trạng thái mặc định như phần cứng thật.
- [ ] WebSocket connected nhưng node offline được thể hiện chính xác.
- [ ] Nhấn bật đèn có trạng thái gửi/chờ; HTTP 202 hoặc success không tự đổi reported state.
- [ ] Đổi màu LED chờ cả trạng thái bật và màu khớp.
- [ ] Timeout không tự gửi lại lệnh; phản hồi muộn vẫn cập nhật đúng node.
- [ ] Đổi node khi đang chờ không làm nhầm kết quả điều khiển.
- [ ] ACK giữ banner active và không tác động còi.
- [ ] Cảnh báo của node khác vẫn được nhìn thấy ở Tổng quan.
- [ ] Offline không tự clear cảnh báo.
- [ ] Scene gửi lỗi một phần được báo đúng và không hứa rollback.
- [ ] Quy tắc không cho target/action ngoài phạm vi service hiện tại.
- [ ] Lịch sử sắp đúng thời gian, không trộn sensor, không tạo điểm từ heartbeat rỗng.
- [ ] 1000 mẫu không bị gọi là đầy đủ dữ liệu 7 ngày.
- [ ] Reconnect đồng bộ lại và không phát lại các lệnh cũ.
- [ ] Form chưa lưu được giữ khi request lỗi; không mất dữ liệu vì realtime.
- [ ] Không có luồng đăng nhập, camera, điều hòa hoặc đặt lịch giả hoạt động.

### Kịch bản trình diễn đồ án

1. Mở Tổng quan, cho thấy node thực đang online và thời điểm mẫu mới.
2. Mở node, chỉ rõ sensor, số đo và ngưỡng do thiết bị báo nếu có.
3. Gửi lệnh LED, quan sát trạng thái chờ rồi trạng thái thiết bị báo lại.
4. Chạy một scene hợp lệ, đối chiếu trạng thái từng target.
5. Tạo quy tắc với ngưỡng phù hợp giá trị đang đo và quan sát phản hồi phần cứng.
6. Xem lịch sử và khoảng thời gian thực sự có mẫu.
7. Nếu có cảnh báo demo, đánh dấu đã xem và chứng minh active chỉ kết thúc khi có sự kiện clear.
8. Ngắt kết nối node để cho thấy dữ liệu cũ được giữ và điều khiển bị khóa.

Nếu chưa có node thứ hai, không trình bày nhiều phòng như đã kiểm chứng phần cứng. Có thể giới thiệu cấu trúc nhóm phòng và khả năng mở rộng bằng sơ đồ, giữ rõ đâu là dữ liệu thực.

## 21. Mở rộng sau bản hiện tại

| Hạng mục | Điều kiện backend trước khi thiết kế luồng hoàn chỉnh |
| --- | --- |
| Tài khoản/đăng nhập | API auth, session/token, quyền truy cập API và WebSocket |
| Quản lý tên phòng/node | CRUD metadata, lưu tên và association ổn định |
| Thêm/xóa node | Quy trình đăng ký, quyền sở hữu, API và trạng thái lifecycle |
| Camera | Nguồn stream/snapshot, trạng thái camera và cơ chế truy cập |
| Điều hòa/thiết bị mới | Firmware, capability action schema, state báo lại và API |
| Ngữ cảnh đổi màu | Scene action có payload RGB và validation tương ứng |
| Lịch theo giờ | Scheduler, timezone và API quản lý lịch |
| Nhật ký hoạt động đầy đủ | Event history, command ID và trạng thái xác nhận từng lệnh |
| Lịch sử dài | Phân trang hoặc tổng hợp theo khoảng, thông tin coverage |
| Mức độ cảnh báo sau ACK | Lưu severity gốc độc lập acknowledged |

## 22. Nguồn đối chiếu trong repository

Các quyết định giao tiếp dữ liệu dựa trên mã nguồn hiện tại; nếu tài liệu tiến độ cũ khác implementation, cần đối chiếu lại các file sau khi backend thay đổi:

- [DeviceActionController.java](../backend-iot/src/main/java/com/iot/controller/DeviceActionController.java): API điều khiển, state, alerts và history.
- [DeviceStateService.java](../backend-iot/src/main/java/com/iot/service/DeviceStateService.java): state báo lại, capability, telemetry và kiểm tra heartbeat.
- [DashboardWebSocketHandler.java](../backend-iot/src/main/java/com/iot/websocket/DashboardWebSocketHandler.java): snapshot INIT_STATE và PING/PONG.
- [WebSocketConfig.java](../backend-iot/src/main/java/com/iot/config/WebSocketConfig.java): đường dẫn WebSocket.
- [AlertService.java](../backend-iot/src/main/java/com/iot/service/AlertService.java): ACK, active và clear theo device.
- [AutomationRuleService.java](../backend-iot/src/main/java/com/iot/service/AutomationRuleService.java): validation, phép so sánh và cooldown.
- [SceneService.java](../backend-iot/src/main/java/com/iot/service/SceneService.java): giới hạn action và ý nghĩa kết quả activate.
- [StatePersistenceService.java](../backend-iot/src/main/java/com/iot/service/StatePersistenceService.java): giới hạn history, thứ tự mẫu và heartbeat TTL.
- [Các model](../backend-iot/src/main/java/com/iot/model): cấu trúc state, sensor, rule, scene và alert.
- [App.jsx](../frontend-react/src/App.jsx), [useIoTWebSocket.js](../frontend-react/src/hooks/useIoTWebSocket.js), [index.css](../frontend-react/src/index.css): cấu trúc giao diện và theme hiện tại.
- [VoiceCommandPanel.jsx](../frontend-react/src/components/VoiceCommandPanel.jsx): khẩu lệnh cố định của frontend hiện có.


## 23. Triển khai theo bộ thiết kế Stitch — 14/10/2026

Đã đọc 6 màn hình trong `UI_UX_IOT` và bộ token Quiet Domestic Utility. Frontend trong `frontend-react` hiện có app shell sáng, menu riêng cho Tổng quan, Phòng & thiết bị, Ngữ cảnh, Tự động hóa, Lịch sử và Cảnh báo. Đã nối REST/WebSocket hiện có, thêm trạng thái chờ lệnh theo node/target, kiểm tra RGB reported, tách ACK/active, timestamp cảm biến, CSV và phân trang tập lịch sử đã tải.

Chi tiết chức năng đã làm, các khác biệt cần giữ so với dữ liệu minh họa trong ảnh, API đề xuất và checklist backend nằm trong [PLAN_FRONTEND_BACKEND.md](PLAN_FRONTEND_BACKEND.md). Các mục BE-01 đến BE-12 là backlog, chưa phải backend đã triển khai. Ưu tiên snapshot/timestamp thật, command ID + firmware ACK, severity độc lập ACK, auth/ownership, metadata phòng, sourceDeviceId cho automation, history pagination/statistics và chi tiết từng action của scene.

Checklist ở mục 20 là tiêu chí nghiệm thu toàn hệ thống; không tự đánh dấu đạt chỉ vì frontend đã build hoặc kiểm tra render thành công. Chưa kiểm tra thị giác trên trình duyệt, microphone hoặc thao tác ESP32 thật trong đợt thay giao diện này.
