// Kiểm tra dữ liệu dùng chung cho các route. Quy tắc trùng với giao diện (DiaNhac/src/app/utils/format.js)
// để trình duyệt chặn được trước, server chặn lần cuối (không tin dữ liệu gửi lên).

// Số di động Việt Nam: 10 chữ số, đầu 03, 05, 07, 08, 09.
const PHONE_REGEX = /^0[35789][0-9]{8}$/;
const PHONE_MESSAGE = 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).';

const isPhone = (value) => PHONE_REGEX.test(String(value || '').trim());

// Mật khẩu tối thiểu cho mọi tài khoản (đăng ký, đổi/khôi phục mật khẩu, tài khoản nhân viên).
const MIN_PASSWORD = 6;

module.exports = { PHONE_REGEX, PHONE_MESSAGE, isPhone, MIN_PASSWORD };
