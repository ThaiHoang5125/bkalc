# Chính sách quyền riêng tư – BKalc

Áp dụng từ BKalc 1.0.x · Cập nhật lần cuối: 28/10/2026

## Tóm tắt

- Dữ liệu học tập của bạn **chỉ nằm trên máy bạn** và không bao giờ được gửi đi.
- Bản web chỉ gửi một tín hiệu ẩn danh "đang mở trang" để đếm số người truy cập (xem mục 5). Bản .exe không gửi gì.
- BKalc không quảng cáo, không theo dõi hành vi cá nhân.
- Bạn có toàn quyền xem, sao lưu và xóa dữ liệu của mình.

## 1. BKalc lưu những gì

- Dữ liệu học tập bạn nhập hoặc nhập từ bảng điểm: môn học, điểm, tín chỉ, kế hoạch học kỳ, thời khóa biểu, mục tiêu GPA.
- Tùy chọn giao diện: ngôn ngữ, sáng/tối, thu gọn thanh bên, ngày bắt đầu tuần học đầu tiên.

## 2. Lưu ở đâu và được bảo vệ thế nào

- **Bản cài đặt (.exe):** lưu trong thư mục `%APPDATA%\BKalc` trên máy bạn. Nếu máy còn thư mục cũ `%APPDATA%\HCMUT GPA` (tên cũ của app), BKalc sao chép dữ liệu sang thư mục mới ở lần chạy đầu và giữ nguyên bản cũ.
- **Bản web (trình duyệt):** lưu trong bộ nhớ cục bộ (`localStorage`) của trình duyệt bạn đang dùng, không lưu trên máy chủ. Đổi trình duyệt hoặc xóa dữ liệu duyệt web sẽ làm mất dữ liệu nếu chưa sao lưu. Trang web được lưu trữ trên Cloudflare Pages nên Cloudflare có thể ghi nhật ký truy cập trang theo chính sách của họ; dữ liệu học tập của bạn không đi qua Cloudflare.
- BKalc **không có tài khoản hay mật khẩu**. Dữ liệu được lưu **không mã hóa** trên máy bạn, nên ai dùng được máy (hoặc trình duyệt) này đều có thể đọc được điểm của bạn. Máy dùng chung thì hãy dùng tài khoản người dùng riêng của hệ điều hành hoặc cửa sổ ẩn danh.
- Người dùng bản cũ có tài khoản mã hóa: lần mở đầu tiên sau khi cập nhật, BKalc yêu cầu nhập mật khẩu cũ một lần để chuyển dữ liệu sang dạng lưu thường. Quên mật khẩu thì không ai khôi phục được, kể cả tác giả; bạn có thể bỏ dữ liệu cũ và bắt đầu mới, hoặc nạp lại từ file sao lưu.

## 3. Nhập bảng điểm (PDF / ảnh)

File bảng điểm được đọc **ngay trên thiết bị của bạn** (nhận dạng chữ OCR chỉ có ở bản .exe), không tải lên đâu cả. BKalc chỉ lưu kết quả đã nhập, không giữ lại file gốc.

## 4. File sao lưu và file xuất

- **File sao lưu JSON không được mã hóa.** Ai có file này đều đọc được điểm của bạn. Hãy cất cẩn thận, đừng gửi hoặc đăng công khai.
- File Excel xuất ra cũng chứa dữ liệu điểm của bạn, hãy xử lý tương tự.
- Chỉ nạp file sao lưu từ nguồn bạn tin tưởng.

## 5. Thống kê truy cập (chỉ bản web)

- Khi bạn mở bản web và tab đang hiển thị, trình duyệt gửi khoảng 90 giây một lần một **mã ngẫu nhiên theo tab** (mất khi đóng tab) đến máy chủ của BKalc trên Cloudflare.
- Máy chủ chỉ lưu: mã ngẫu nhiên đó cùng thời điểm gần nhất (xóa sau 1 giờ) và **số người online cao nhất mỗi 5 phút** (giữ 90 ngày). Không lưu IP, tài khoản, thiết bị, vị trí hay bất kỳ dữ liệu học tập nào.
- Chỉ tác giả xem được số liệu này, để biết có bao nhiêu người đang dùng.
- Bản .exe không gửi tín hiệu này.

## 6. BKalc không làm gì

- Bản .exe không cần kết nối mạng để hoạt động; bản web chỉ cần mạng để tải trang.
- Không gửi điểm, bảng điểm hay dữ liệu học tập cho tác giả, nhà trường hay bên thứ ba nào.
- Không có phân tích hành vi, quảng cáo hay tự cập nhật.

## 7. Quyền của bạn

- **Sao lưu:** mục "Sao lưu dữ liệu" trong trang Dữ liệu & cài đặt.
- **Xóa dữ liệu trong app:** "Xóa tất cả…" trong Dữ liệu & cài đặt → Cài đặt.
- **Xóa toàn bộ (bản .exe):** đóng BKalc, rồi xóa thư mục `%APPDATA%\BKalc` (và `%APPDATA%\HCMUT GPA` nếu còn). Nhập đường dẫn vào thanh địa chỉ của File Explorer để mở nhanh. Bản .exe chạy trực tiếp nên không cần gỡ cài đặt.
- **Xóa toàn bộ (bản web):** xóa dữ liệu trang trong cài đặt trình duyệt, hoặc dùng "Xóa tất cả…" trong app.

## 8. Lưu ý

BKalc là công cụ cá nhân, **không phải sản phẩm chính thức của Trường Đại học Bách khoa – ĐHQG-HCM**. Kết quả tính chỉ để tham khảo; số liệu chính thức theo quy định và hệ thống của nhà trường.

## 9. Liên hệ và thay đổi

Thắc mắc về quyền riêng tư: hoangluuanthai.work@gmail.com

Nếu chính sách thay đổi (ví dụ app bắt đầu dùng mạng), bản mới sẽ được cập nhật tại đây và ghi rõ ngày thay đổi.
