# Real-time Chat System

Sistem chat real-time berbasis room dengan WebSocket, menggunakan MongoDB untuk storage dan Redis untuk caching & session management.

## Fitur

- Autentikasi (register, login, logout)
- Room management (buat & join room)
- Real-time messaging via WebSocket
- Message history dengan smart caching
- Session 24 jam otomatis

## Tech Stack

- Backend: [Node.js/Python/sesuaikan]
- Database: MongoDB (persistent storage)
- Cache: Redis (session & message cache)
- Real-time: WebSocket
- Docker & Docker Compose

## Quick Start

```bash
# Clone repo
git clone https://github.com/username/realtime-chat-system.git
cd realtime-chat-system

# Setup environment
cp .env.example .env
# Edit .env sesuai kebutuhan

# Jalankan dengan Docker
docker-compose up -d --build

# Akses aplikasi
http://localhost:3000
```

## Environment Variables

```env
APP_PORT=3000
MONGO_HOST=mongodb
MONGO_PORT=27017
MONGO_DB=chatdb
MONGO_USER=user
MONGO_PASSWORD=password
REDIS_HOST=redis
REDIS_PORT=6379
SESSION_SECRET=your_secret_key
```

## API Endpoints

**Authentication:**
- `POST /api/auth/register` - Daftar akun baru
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

**Rooms:**
- `POST /api/rooms` - Buat room baru
- `GET /api/rooms` - List semua room
- `POST /api/rooms/:id/join` - Join room

**Messages:**
- `GET /api/rooms/:id/messages` - Ambil riwayat pesan

## Cara Kerja

1. **Register/Login** → Data user di MongoDB, session di Redis (24 jam)
2. **Join Room** → WebSocket connection dibuka
3. **Send Message** → Disimpan di MongoDB + Redis cache (100 pesan terbaru)
4. **Broadcast** → Pesan dikirim real-time ke semua member yang online
5. **Message History** → Dibaca dari Redis (fast), fallback ke MongoDB jika cache expired

## Caching Strategy

- Redis menyimpan 100 pesan terbaru per room
- TTL: 1 jam (refresh otomatis saat ada pesan baru)
- FIFO strategy untuk batasi memory
- Fallback ke MongoDB jika cache miss

