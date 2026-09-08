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

Sửa `DATABASE_URL` và `JWT_SECRET` trong `apps/api/.env`. Không commit file môi trường thật lên Git.

## Khởi tạo cơ sở dữ liệu

Tạo database PostgreSQL tên `patch_management`, sau đó chạy:

```bash
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

Seed tạo bốn tài khoản, tất cả dùng mật khẩu `password123`:

| Email | Role |
|---|---|
| `admin@example.com` | `ADMIN` |
| `manager@example.com` | `MANAGER` |
| `helpdesk@example.com` | `IT_HELPDESK` |
| `user@example.com` | `USER` |

Seed cũng tạo software, patch, device, kế hoạch đang chờ duyệt, ticket và policy mẫu. Chỉ sử dụng thông tin đăng nhập này trong môi trường phát triển.

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

Mọi route trừ `/api/health` và `/api/auth/login` yêu cầu `Authorization: Bearer <accessToken>`.

- `POST /api/auth/login`
- `GET /api/users/me`
- `GET /api/software`
- `GET /api/patches`
- `GET /api/devices`
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

Ví dụ đăng nhập:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"helpdesk@example.com","password":"password123"}'
```

## Gợi ý chia việc cho ba thành viên

1. **Nền tảng và quản trị:** `auth`, `users`, `roles`, `policies`, `audit-logs`, migration và bảo mật.
2. **Tài sản và triển khai:** `software`, `patches`, `devices`, `agent`, `deployment-plans`, `deployment-tasks`.
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
- Khai báo `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL` và `PORT`.
- Gắn Render PostgreSQL và chạy `npm run db:migrate -- --name init` ở môi trường chuẩn bị trước khi phát hành.

Không dùng tài khoản seed hoặc JWT secret mẫu trong production.
