# NextTalk

Ứng dụng nhắn tin thời gian thực dạng monorepo: backend NestJS, web client Next.js, và desktop client Electron. Đang trong quá trình phát triển.

## Cấu trúc

```
NextTalk/
├── backend/    # NestJS API + WebSocket gateway (chat, calls, auth, admin...)
├── web/        # Next.js web client
└── desktop/    # Electron desktop client (Windows/macOS)
```

## Tính năng

- **Nhắn tin thời gian thực** qua Socket.io, scale nhiều instance bằng Redis adapter (`@socket.io/redis-adapter`)
- **Gọi thoại/video WebRTC** — signaling gateway riêng (`calls`), UI cuộc gọi đến/đang gọi trên web
- **Đăng nhập Google OAuth 2.0** (Passport), xác thực JWT
- **Admin Dashboard** — quản lý người dùng, thống kê, phân quyền RBAC (`admin` module + guards/decorators riêng)
- **Stories** (dạng tin 24h) và **upload file** qua MinIO object storage
- **Push notification** qua Firebase Admin SDK
- **Desktop app** (Electron) — system tray, thông báo native, auto-update qua GitHub Actions CI, thanh tiêu đề tùy chỉnh kiểu Zalo

## Tech stack

| | |
|---|---|
| Backend | NestJS, Prisma + PostgreSQL, Socket.io, Redis (ioredis), Passport (JWT + Google OAuth), MinIO, Firebase Admin |
| Web | Next.js, React Query (TanStack), Zustand, socket.io-client, Tailwind CSS |
| Desktop | Electron, electron-builder, electron-updater |

## Trạng thái hiện tại

Backend đã deploy live trên Render. Web/desktop client đang tiếp tục hoàn thiện — đây là dự án cá nhân đang phát triển, chưa phải bản production hoàn chỉnh.

## Chạy local

**Backend**
```bash
cd backend
pnpm install
# Cấu hình biến môi trường: DATABASE_URL (PostgreSQL), REDIS_URL,
# JWT secret, Google OAuth client ID/secret, Firebase service account, MinIO credentials
pnpm run start:dev
```

**Web**
```bash
cd web
pnpm install
pnpm run dev
```

**Desktop**
```bash
cd desktop
pnpm install
pnpm run dev
```

## Tác giả

**Thiên** — [github.com/Thien-Developer](https://github.com/Thien-Developer)
