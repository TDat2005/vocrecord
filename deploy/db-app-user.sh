#!/bin/sh
# Tạo (hoặc cập nhật mật khẩu) user MySQL riêng cho API: chỉ đọc/ghi dữ liệu của CSDL clonevocrecord,
# không tạo/xóa bảng, không đụng tới CSDL khác. API lỡ bị lỗi bảo mật thì kẻ tấn công cũng không có quyền root.
#
# Chạy bên trong container db:
#   - CSDL mới (volume trống): MySQL tự chạy file này ở bước khởi tạo (docker-entrypoint-initdb.d).
#   - CSDL đã có: workflow deploy chạy lại mỗi lần triển khai, hoặc chạy tay:
#       docker compose -f docker-compose.prod.yml exec -T db sh /docker-entrypoint-initdb.d/99_app_user.sh
# Chưa đặt MYSQL_APP_USER và MYSQL_APP_PASSWORD (file .env) thì bỏ qua: API vẫn dùng root như trước.
# Lưu ý: file này được entrypoint của MySQL "source" ở bước khởi tạo nên không được gọi `exit`.

if [ -n "${MYSQL_APP_USER:-}" ] && [ -n "${MYSQL_APP_PASSWORD:-}" ]; then
  case "${MYSQL_APP_USER}${MYSQL_APP_PASSWORD}" in
    *[!A-Za-z0-9_.-]*)
      echo "MYSQL_APP_USER/MYSQL_APP_PASSWORD chỉ được gồm chữ, số, dấu _ . - (tạo mật khẩu bằng: openssl rand -hex 24)" >&2
      ;;
    *)
      MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot <<SQL
CREATE USER IF NOT EXISTS '${MYSQL_APP_USER}'@'%' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
ALTER USER '${MYSQL_APP_USER}'@'%' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE ON clonevocrecord.* TO '${MYSQL_APP_USER}'@'%';
FLUSH PRIVILEGES;
SQL
      echo "Đã cấp quyền đọc/ghi clonevocrecord cho user MySQL ${MYSQL_APP_USER}"
      ;;
  esac
fi
