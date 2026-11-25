# G00 — L04 căn thẳng hàng nhãn và giá trị trên bảng (25/11/2026)

- Baseline 371050318c57932b23ee911b3ab58c2a95c9c1ad, PR #239 đã phát hành.
- Nguyên nhân: nhãn flex chỉ có min-width; cỡ chữ lớn làm Phòng/UBND dài hơn VP/CV, đẩy điểm bắt đầu của nội dung. Bản in dùng hai track grid cố định.
- Sửa L04 màn hình dùng hai track đồng nhất, rail nhãn co giãn theo cỡ chữ, rail giá trị minmax(0,1fr); U04 CV + Phòng dùng wrapper để xuống dòng trong rail giá trị, không lùi về rail nhãn.
- Không đổi dữ liệu, phân quyền, cấu hình/mẫu Firebase, bản in A4 hoặc workflow. Kiểm thử pixel trái/độ rộng nhãn/điểm bắt đầu giá trị ở 11/13/16/20px, real guest, admin desktop/mobile production CSS, U04 và guest editable. Chờ kết quả exact head.
