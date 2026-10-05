# CI/CD và triển khai Vọc Records

## 1. Tổng quan

```
push code ──► GitHub Actions (CI)
               ├─ Backend: dựng MySQL, chạy 28 ca kiểm thử API (server/tests/api.test.js)
               ├─ Frontend: npm ci + build
               └─ (chỉ nhánh main) build 2 image Docker, đẩy lên GitHub Container Registry
                    ghcr.io/tdat2005/vocrecord-api , ghcr.io/tdat2005/vocrecord-web

bấm "Run workflow" ──► Deploy production (CD, chạy tay)
               └─ SSH vào VPS: kéo image mới, docker compose up -d, kiểm tra /health

Trên VPS:  Internet ─► Caddy (80/443, HTTPS tự động) ─► web (Nginx + React) ─► api (Node.js) ─► db (MySQL)
```

- **CI chạy miễn phí** trên GitHub, không cần VPS. Mỗi lần push/PR đều được kiểm thử.
- **CD chạy tay** (workflow `Deploy production`), chỉ dùng khi có VPS, ví dụ trước buổi thi. Không thuê VPS thì không tốn tiền.

## 2. Việc cần làm ngay (không tốn tiền)

1. Push code lên GitHub → mở tab **Actions** xem workflow **CI** chạy.
2. Sau khi CI trên `main` chạy xong, vào **Profile → Packages** sẽ thấy 2 image `vocrecord-api`, `vocrecord-web`.

## 3. Khi cần lên production (ví dụ trước buổi thi)

### 3.1. Thuê VPS
- Ubuntu 22.04/24.04, tối thiểu 1 vCPU, 1 GB RAM (nên tạo thêm 2 GB swap vì MySQL dùng nhiều RAM).
- Cài Docker: `curl -fsSL https://get.docker.com | sh` rồi `sudo usermod -aG docker $USER` (đăng xuất, đăng nhập lại).
- Mở cổng 22, 80, 443.

### 3.2. Trỏ tên miền
Tại trang quản lý tên miền `ngtiendat.id.vn`, tạo 2 bản ghi:

| Loại | Tên | Giá trị |
|------|-----|---------|
| A | @ | IP của VPS |
| A | www | IP của VPS |

Đợi DNS cập nhật (kiểm tra: `nslookup ngtiendat.id.vn`) rồi mới chạy deploy, vì Caddy cần DNS đúng để xin chứng chỉ HTTPS.

### 3.3. Tạo file cấu hình trên VPS (chỉ làm 1 lần)
```bash
mkdir -p ~/vocrecord/deploy && cd ~/vocrecord
nano .env                  # theo mẫu deploy/compose.env.example
nano deploy/server.env     # theo mẫu deploy/server.env.example
```
- `MYSQL_ROOT_PASSWORD`: tạo bằng `openssl rand -base64 24`.
- `JWT_SECRET`: tạo bằng `openssl rand -hex 32`.
- PayOS: khai báo webhook `https://ngtiendat.id.vn/api/payos/webhook` trên trang my.payos.vn.

### 3.4. Khai báo secrets cho GitHub
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Giá trị |
|--------|---------|
| `SSH_HOST` | IP VPS |
| `SSH_USER` | user đăng nhập VPS (vd. `ubuntu`) |
| `SSH_PRIVATE_KEY` | nội dung private key (tạo bằng `ssh-keygen -t ed25519`, public key thêm vào `~/.ssh/authorized_keys` trên VPS) |
| `SSH_PORT` | (tùy chọn) nếu không phải 22 |

### 3.5. Deploy
Tab **Actions → Deploy production → Run workflow** (tag `latest` hoặc mã commit muốn chạy).
Workflow chép `docker-compose.prod.yml`, `deploy/Caddyfile`, các script SQL lên VPS, kéo image và khởi động lại. Mở https://ngtiendat.id.vn để kiểm tra.

Lần đầu, MySQL tự chạy các script `database/01…07` và `migrate_08` để tạo 23 bảng và dữ liệu sản phẩm mẫu (không nạp các file `backup_*.sql`).

### 3.6. Khôi phục dữ liệu cũ (nếu muốn)
```bash
cd ~/vocrecord
docker compose -f docker-compose.prod.yml exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" clonevocrecord' < backup.sql
docker compose -f docker-compose.prod.yml exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" clonevocrecord' < database/migrate_08_fk_restrict_sanpham.sql
```

### 3.7. Sau buổi thi: sao lưu rồi hủy VPS để khỏi tốn tiền
```bash
docker compose -f docker-compose.prod.yml exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" clonevocrecord' > backup_$(date +%F).sql
```
Tải file sao lưu về máy (`scp`), **không** commit lên GitHub (file chứa email, mật khẩu đã băm của người dùng).

## 4. Chạy thử production trên máy cá nhân
```bash
cp deploy/compose.env.example .env && cp deploy/server.env.example deploy/server.env
# sửa DOMAIN=localhost trong .env
docker compose -f docker-compose.prod.yml up -d
```
