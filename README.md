# Patch Management System

Monorepo cho hệ thống quản lý bản vá phần mềm. Frontend giữ nguyên giao diện Azure Update Manager đã dựng, backend được chia theo domain để nhóm có thể phát triển song song.

## Kiến trúc

```text
patch-management-system/
├── apps/
│   ├── web/                 # Next.js App Router + TypeScript
│   └── api/                 # NestJS + Prisma REST API
├── packages/
│   └── shared/              # Enum và interface dùng chung
├── package.json             # npm workspaces + script toàn monorepo
└── README.md
```

Backend dùng PostgreSQL qua Prisma. Frontend gọi API thông qua biến `NEXT_PUBLIC_API_URL`.

## Yêu cầu môi trường

- Node.js 20 trở lên
- npm 10 trở lên
- PostgreSQL 15 trở lên

## Cài đặt

Tại thư mục gốc:

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Sửa `DATABASE_URL`, `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` trong `apps/api/.env`. Không commit file môi trường thật lên Git.

## Khởi tạo cơ sở dữ liệu

Tạo database PostgreSQL tên `patch_management`, sau đó chạy:

```bash
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

Seed tạo năm tài khoản, tất cả dùng mật khẩu `password123`:

| Email | Role |
|---|---|
| `admin@example.com` | `ADMIN` |
| `manager@example.com` | `MANAGER` |
| `helpdesk@example.com` | `IT_HELPDESK` |
| `security@example.com` | `SECURITY_ANALYST` |
| `user@example.com` | `USER` |

Seed cũng tạo software, patch, device, kế hoạch đang chờ duyệt, ticket và policy mẫu. Chỉ sử dụng thông tin đăng nhập này trong môi trường phát triển.

## Vai trò và phạm vi quyền

Hệ thống dùng role enum đơn giản thay vì một schema RBAC động, phù hợp với phạm vi đồ án:

| Role | Trách nhiệm chính |
|---|---|
| `ADMIN` | Quản lý tài khoản, danh mục phần mềm, policy và audit log |
| `MANAGER` | Xem báo cáo, theo dõi và review kế hoạch triển khai |
| `IT_HELPDESK` | Lập/triển khai kế hoạch, theo dõi thiết bị và xử lý ticket |
| `SECURITY_ANALYST` | Đọc dữ liệu phần mềm, bản vá, thiết bị, kế hoạch; xem báo cáo và audit log để đánh giá rủi ro |
| `USER` | Theo dõi thiết bị cá nhân, thông báo và ticket |

`SECURITY_ANALYST` có quyền chỉ đọc đối với dữ liệu quản trị và triển khai trong scaffold hiện tại. Role này không được tạo/sửa/xóa phần mềm, sửa policy, review hoặc triển khai kế hoạch. Module CVE/CVSS chuyên sâu được dành cho giai đoạn mở rộng và không yêu cầu thay đổi sang schema RBAC 24 bảng.

## Chạy local

```bash
# Chạy cả hai ứng dụng
npm run dev

# Hoặc chạy riêng
npm run dev:web
npm run dev:api
```

- Frontend: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Backend API: `http://localhost:4000/api`
- Health check: `GET http://localhost:4000/api/health`

## Kiểm tra mã nguồn

```bash
npm run lint
npm run build
npm run build:web
npm run build:api
```

## API scaffold

Mọi route trừ `/api/health`, `/api/auth/login` và `/api/auth/refresh` yêu cầu `Authorization: Bearer <accessToken>`.

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `GET|POST /api/users` (chỉ `ADMIN`; dữ liệu trả về không gồm hash mật khẩu/token)
- `GET|PATCH|DELETE /api/users/:id` (chỉ `ADMIN`; `DELETE` khóa tài khoản, không xóa dữ liệu)
- `GET /api/software`
- `GET /api/patches`
- `GET /api/devices`
- `GET /api/devices/me` (thiết bị cá nhân của `USER`)
- `GET|POST /api/deployment-plans`
- `PATCH /api/deployment-plans/:id/review`
- `POST /api/deployment-plans/:id/deploy`
- `GET /api/deployment-tasks`
- `GET|POST /api/tickets`
- `PATCH /api/tickets/:id/status`
- `GET /api/notifications`
- `GET /api/reports/overview`
- `GET /api/audit-logs`
- `GET /api/policies`
- `PATCH /api/policies/:id`
- `GET /api/agent/status`

Audit log ghi các thay đổi tài khoản, phần mềm, kế hoạch triển khai, ticket, policy và đăng xuất. Chỉ lưu hành động, người thực hiện, ID đối tượng và route; không lưu body hay token. Nếu ghi log thất bại, API vẫn trả kết quả thao tác và server cảnh báo (cơ chế best-effort ở giai đoạn scaffold, chưa có outbox/transaction đảm bảo tuyệt đối).

Ví dụ đăng nhập:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"helpdesk@example.com","password":"password123"}'
```

## Gợi ý chia việc cho ba thành viên

1. **Nền tảng và quản trị:** `auth`, `users`, `roles`, `policies`, `audit-logs`, migration và bảo mật.
2. **Tài sản, bản vá và phân tích bảo mật:** `software`, `patches`, `devices`, `agent`, báo cáo rủi ro và quyền `SECURITY_ANALYST`.
3. **Vận hành và frontend:** `tickets`, `notifications`, `reports`, kết nối API và hoàn thiện các page Next.js.

Các thay đổi schema nên được review chung. Contract dùng chung đặt tại `packages/shared`; không khai báo lặp enum nghiệp vụ ở từng app.

## Triển khai

### Vercel — frontend

- Import repository và chọn Root Directory `apps/web`.
- Khai báo `NEXT_PUBLIC_API_URL=https://<render-service>/api`.
- Dùng build command mặc định của Next.js.

### Render — backend

- Build command từ root: `npm install && npm run db:generate && npm run build:api`.
- Start command: `npm run start:prod --workspace=@patch-management/api`.
- Khai báo `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `FRONTEND_URL` và `PORT`.
- Gắn Render PostgreSQL và chạy `npm run db:migrate -- --name init` ở môi trường chuẩn bị trước khi phát hành.

Không dùng tài khoản seed hoặc JWT secret mẫu trong production.
