# Checklist kiểm thử thủ công — Patch Management System

Ghi người test, ngày, commit `main`, trình duyệt và kết quả vào mỗi mục (`PASS`, `FAIL` kèm ảnh/log, hoặc `N/A`). Chỉ dùng database Supabase **test**. Với thao tác tạo/xóa/khóa, tạo dữ liệu tạm riêng; không khóa tài khoản demo hoặc xóa phần mềm có bản vá thật.

Frontend: `http://localhost:3000`. API: `http://localhost:4000/api`. Năm tài khoản demo và mật khẩu nằm trong README. Với mục ghi “API-only”, dùng Postman/curl và access token của đúng role; trang frontend tương ứng hiện chưa nối API.

## 1. Môi trường và kết nối

- [ ] Đang ở `main`, worktree sạch; `npm install`, `npm run lint` và `npm run build` hoàn tất.
- [ ] `apps/api/.env` trỏ tới Supabase test: `DATABASE_URL` dùng pooler `6543`, `DIRECT_URL` dùng cổng `5432`; không đưa URL/mật khẩu vào ảnh lỗi.
- [ ] `npm run dev` mở frontend và API; `GET /api/health` trả kết quả thành công, không có `NetworkError` trên trang login.
- [ ] `npx prisma migrate status` trong `apps/api` báo schema cập nhật; nếu cổng `5432` chậm, dùng `sslmode=require&connect_timeout=30` trong `DIRECT_URL`.
- [ ] Seed đã có 5 user, 3 software, 3 patch, 3 device, 1 plan, 1 ticket; chạy lại `npm run db:seed` không tạo bản ghi trùng.

## 2. Đăng nhập, phiên và layout chung

- [ ] Lần lượt đăng nhập `ADMIN`, `MANAGER`, `IT_HELPDESK`, `SECURITY_ANALYST`, `USER`; mỗi tài khoản vào Dashboard và `/profile` hiển thị đúng tên, email, role.
- [ ] Sai email/mật khẩu hiển thị lỗi, không tạo phiên; API `POST /auth/login` trả lỗi xác thực.
- [ ] Không có token: mở thẳng `/dashboard` bị chuyển về `/login`; API có bảo vệ trả `401` nếu thiếu Bearer token.
- [ ] Chuyển giữa các module: sidebar bên trái giữ nguyên, mục được chọn đổi theo route, phần nội dung đổi mà không reload toàn trang.
- [ ] Thu gọn/mở sidebar, mở menu trên màn hình nhỏ, vào `/profile` từ menu tài khoản đều hoạt động.
- [ ] Đăng xuất xóa phiên ở trình duyệt và chuyển về `/login`; quay lại trang bảo vệ không tự đăng nhập lại.
- [ ] Access token hết hạn: yêu cầu API tự refresh một lần rồi tiếp tục; refresh token đã logout/hết hạn không dùng lại được. Có thể kiểm tra mục này bằng Postman nếu không muốn chờ 15 phút.
- [ ] `ADMIN` thấy menu Users; role khác không thấy Users. `SECURITY_ANALYST` chỉ thấy menu đọc phù hợp. Nếu role khác còn thấy menu không có quyền, ghi lỗi UX; API vẫn phải trả `403`.

## 3. Admin — tài khoản và phần mềm (frontend + API)

- [ ] `/users` tải danh sách 5 user và tìm được theo tên/email/role; không hiển thị hash mật khẩu hoặc refresh token.
- [ ] Tạo một user tạm với email mới, role `USER`, mật khẩu tối thiểu 8 ký tự; user xuất hiện sau làm mới và đăng nhập được.
- [ ] Email đã tồn tại hoặc mật khẩu quá ngắn bị từ chối với thông báo rõ; không tạo user trùng.
- [ ] Sửa tên/role/mật khẩu của user tạm; phiên cũ không tiếp tục dùng role cũ sau khi role thay đổi.
- [ ] Khóa user tạm bằng nút Khóa hoặc `DELETE /users/:id`; tài khoản vẫn nằm trong danh sách nhưng không thể đăng nhập. Mở lại qua form chỉnh sửa nếu cần.
- [ ] Admin không thể tự khóa hoặc tự đổi role của mình; role không phải Admin gọi `GET/POST/PATCH/DELETE /users` bị `403`.
- [ ] `/software` tải 3 phần mềm seed; tìm kiếm, mở chi tiết và làm mới danh sách hoạt động.
- [ ] Admin tạo phần mềm tạm có `name` + `vendor` mới, sửa phiên bản/tên, rồi xóa đúng phần mềm tạm; danh sách cập nhật sau mỗi thao tác.
- [ ] Cặp `name` + `vendor` trùng bị từ chối; role không phải Admin chỉ đọc và API ghi phần mềm trả `403`.

## 4. IT Helpdesk và Manager — kế hoạch triển khai

- [ ] `/deployment-plans` tải kế hoạch seed; chọn một dòng thấy chi tiết thiết bị, bản vá, task và trạng thái.
- [ ] `IT_HELPDESK` tạo kế hoạch tạm với ít nhất một device và một patch; kế hoạch ở `DRAFT`, số task khớp tích Descartes device × patch.
- [ ] Helpdesk sửa tên/lịch/device/patch của kế hoạch `DRAFT`; task cập nhật đúng, không để task cũ trùng.
- [ ] Helpdesk xóa kế hoạch `DRAFT` tạm sau xác nhận; không xóa được kế hoạch ở trạng thái khác. Không thử xóa kế hoạch seed.
- [ ] `MANAGER` đọc được kế hoạch nhưng không thấy form chỉnh sửa; `USER` không đọc được API danh sách kế hoạch (`403`).
- [ ] **API-only:** Manager dùng `PATCH /deployment-plans/:id/review` với `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`; reviewer, thời gian và ghi chú được lưu. Role khác gọi review bị `403`.
- [ ] **API-only:** Helpdesk gọi `POST /deployment-plans/:id/deploy` chỉ với kế hoạch `APPROVED`; chuyển sang `DEPLOYING`, task sang `PENDING`. Kế hoạch chưa duyệt bị từ chối; Manager không được deploy.
- [ ] **API-only:** `GET /deployment-tasks` phản ánh task của kế hoạch; ghi lỗi nếu trạng thái task/plan không nhất quán.

## 5. User, ticket và dữ liệu cá nhân (API-only trừ Profile)

- [ ] User mở `/profile` thấy đúng các thiết bị được gán; `GET /devices/me` chỉ trả thiết bị của chính user.
- [ ] User gọi `GET /devices` toàn hệ thống bị `403`; Helpdesk/Manager/Admin/Security Analyst đọc được danh sách thiết bị.
- [ ] User tạo ticket tạm qua `POST /tickets`, rồi `GET /tickets` chỉ thấy ticket của mình. User khác không thấy ticket này.
- [ ] Helpdesk xem danh sách ticket và đổi trạng thái ticket tạm qua `PATCH /tickets/:id/status`; User/Security Analyst không được đổi trạng thái.
- [ ] `GET /notifications` chỉ trả thông báo của tài khoản đang đăng nhập; không lộ thông báo của user khác.

## 6. Security Analyst, policy, báo cáo và audit (API-only)

- [ ] `SECURITY_ANALYST` đọc được software, patch, device, plan, task, agent status, report overview và audit log.
- [ ] Security Analyst không tạo/sửa/xóa software, không review/deploy plan, không sửa policy, không tạo ticket; API trả `403`.
- [ ] `GET /policies` trả policy seed cho role vận hành/analyst; chỉ Admin sửa được `PATCH /policies/:id`. Số giờ hoãn âm bị từ chối.
- [ ] `GET /reports/overview` trả dữ liệu thống kê hợp lệ cho các role được cấp; User bị `403`.
- [ ] Sau khi Admin sửa user/software/policy, Manager review plan, Helpdesk deploy plan/ticket, `GET /audit-logs` có hành động và actor tương ứng.
- [ ] Audit log không chứa mật khẩu, hash, access/refresh token hoặc body request; User/Helpdesk/Manager không đọc được audit log (`403`).
- [ ] `GET /patches` và `GET /agent/status`/`GET /deployment-tasks` trả dữ liệu hoặc mảng rỗng hợp lệ; không có `500` do thiếu quan hệ.

## 7. Giao diện hiện còn demo/placeholder — không tính là CRUD đã hoàn thành

- [ ] Dashboard hiển thị được dữ liệu **demo hardcode**, tìm/filter máy, mở drawer và chuyển route; không đối chiếu các số liệu này với Supabase.
- [ ] Các trang `/devices`, `/patches`, `/tickets`, `/reports`, `/policies`, `/audit-logs` không trắng/không crash khi điều hướng, nhưng hiện chỉ là placeholder và nút “Tạo mới” chưa nối nghiệp vụ.
- [ ] Review/deploy plan, ticket CRUD, policy, audit và reports hiện cần test qua API; ghi riêng yêu cầu frontend còn thiếu thay vì đánh fail cho API đã hoạt động.

## 8. Kết thúc vòng test

- [ ] Ghi mọi lỗi với role, URL/API, bước tái hiện, dữ liệu đầu vào (đã che secret), kỳ vọng/thực tế và ảnh/log.
- [ ] Kiểm tra lại dữ liệu tạm đã tạo; chỉ xóa/khóa đúng bản ghi test khi cần, không xóa dữ liệu seed dùng chung cho nhóm.
- [ ] Chạy lại smoke test login, Profile, Users, Software và Deployment Plans sau khi sửa lỗi quan trọng.
