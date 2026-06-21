# JD Validator Pro

Công cụ kiểm tra cấu trúc Job Description (JD) tự động hoàn toàn chạy trên trình duyệt (Client-side), sử dụng React, Vite, và File System Access API. Giúp bạn quét và so khớp các file JD (`.docx`) số lượng lớn một cách nhanh chóng và bảo mật.

## Tính năng chính
- 🔒 **100% Client-side**: Mọi thao tác xử lý file diễn ra cục bộ trên trình duyệt của bạn, không gửi dữ liệu lên server, đảm bảo an toàn tuyệt đối.
- 📁 **File System Access API**: Quét đệ quy và truy cập hệ thống thư mục cục bộ cực nhanh.
- ⚡ **Xử lý `.docx` với Mammoth.js**: Trích xuất nội dung văn bản mà không cần MS Word.
- 📊 **So khớp cấu trúc linh hoạt**: Cho phép đánh giá dựa trên mức độ tương đồng của các đề mục, bao gồm cả trọng số về thứ tự.
- 💾 **Lưu và Phân loại file**: Tự động lưu và đổi tên các file hợp lệ (`_valid.docx`) và lỗi cấu trúc (`_invalid.docx`) ra thư mục xuất.
- 📈 **Báo cáo chi tiết**: Xuất báo cáo dạng `.csv` để dễ dàng quản lý.

## Bắt đầu

Dự án này sử dụng Vite. 

### Cài đặt và Chạy thử:
1. Đảm bảo bạn đã cài đặt [Node.js](https://nodejs.org/).
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi chạy môi trường phát triển (Dev Server):
   ```bash
   npm run dev
   ```

### Build & Triển khai
Để build production:
```bash
npm run build
```
Dự án được cấu hình sẵn cho GitHub Actions để deploy lên GitHub Pages tự động mỗi khi có code mới đẩy lên nhánh `master`.
