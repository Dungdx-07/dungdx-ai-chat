# Dũng AI Chat

Website chat tiếng Việt tối ưu điện thoại, dùng Node.js làm proxy an toàn cho fal.ai OpenRouter chat completions.

## Cần có
- Node.js 18 trở lên trên máy chủ/máy tính.
- Một API key fal.ai hợp lệ và tài khoản có thể sử dụng endpoint/model đã chọn.

## Chạy local
1. Giải nén thư mục.
2. Cài Node.js 18+.
3. Trong thư mục dự án, chạy `npm install`.
4. Sao chép `.env.example` thành `.env`.
5. Mở `.env`, đặt `FAL_KEY` thành khóa API MỚI của bạn. Không chia sẻ tệp `.env`.
6. Chạy `npm start`.
7. Mở `http://localhost:3000` trên máy chạy server.

Nếu chỉ có điện thoại Android, có thể dùng môi trường chạy Node.js phù hợp trên Android để thử local, nhưng để website hoạt động ổn định cho nhiều thiết bị, nên triển khai Node.js lên máy chủ HTTPS. Trên điện thoại, địa chỉ `localhost` chỉ trỏ về chính điện thoại đó; website chạy trên máy khác cần dùng địa chỉ máy chủ và mạng phù hợp.

## Triển khai online
Đưa thư mục này lên một dịch vụ hosting hỗ trợ Node.js. Đặt lệnh build/install là `npm install`, lệnh start là `npm start`, và thêm biến môi trường `FAL_KEY` (cùng `FAL_MODEL` nếu muốn đổi model). Bật HTTPS. Không đưa `.env` vào kho mã công khai.

## Bảo mật trước khi phát hành công khai
- Thu hồi API key đã từng dán trong chat hoặc công khai; tạo khóa mới.
- Không commit `.env`; `.gitignore` đã loại trừ tệp này.
- Bản demo có giới hạn đơn giản theo IP và độ dài đầu vào. Trước khi mở công khai, cần thêm đăng nhập, rate limit dùng Redis hoặc tương đương, giới hạn chi phí ở tài khoản/provider, giám sát và chính sách quyền riêng tư.
- Lịch sử chat hiện được lưu trong `localStorage` của trình duyệt, không đồng bộ giữa các thiết bị và có thể bị xóa khi người dùng xóa dữ liệu trình duyệt.

## Cấu hình mô hình
Mặc định: `google/gemini-2.5-flash`. Có thể thay `FAL_MODEL` trong biến môi trường bằng model ID mà tài khoản/endpoint fal.ai hỗ trợ. Giá thay đổi theo model và token; xem trang model/usage/billing của fal.ai trước khi dùng thật.
