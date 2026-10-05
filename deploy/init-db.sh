#!/usr/bin/env bash
# Dựng CSDL clonevocrecord từ các script migration (không dùng file backup_*.sql).
# Dùng: MYSQL="mysql -h127.0.0.1 -uroot -proot" bash deploy/init-db.sh
set -euo pipefail
: "${MYSQL:?Thiếu biến MYSQL}"
$MYSQL --default-character-set=utf8mb4 < database/01_init_database.sql
for f in database/0[2-9]_*.sql database/migrate_*.sql; do
  echo "-> $f"
  $MYSQL --default-character-set=utf8mb4 clonevocrecord < "$f"
done
echo "Đã khởi tạo CSDL clonevocrecord"
