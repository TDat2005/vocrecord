/*
 * Kịch bản kiểm thử API backend Vọc Records (kiểm thử hộp đen, không cần Postman).
 * Chạy:  node tests/api.test.js
 * Biến môi trường (có giá trị mặc định):
 *   BASE_URL       http://localhost:3000/api
 *   CUSTOMER_USER / CUSTOMER_PASS   tài khoản khách hàng
 *   STAFF_USER    / STAFF_PASS      tài khoản nhân viên
 *   ADMIN_USER    / ADMIN_PASS      tài khoản quản trị
 * Lưu ý: kịch bản tạo đơn, nhập kho và chuyển 1 sản phẩm sang "ngừng kinh doanh",
 * nên chỉ chạy trên CSDL kiểm thử.
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000/api';
const ACC = {
  customer: [process.env.CUSTOMER_USER || 'khachdemo', process.env.CUSTOMER_PASS || 'Demo@123'],
  staff: [process.env.STAFF_USER || 'nhanvien', process.env.STAFF_PASS || 'Demo@123'],
  admin: [process.env.ADMIN_USER || 'admin', process.env.ADMIN_PASS || 'Demo@123'],
};

async function call(method, url, body, token) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* không có body JSON */ }
  return { status: res.status, data: data || {} };
}

const results = [];
async function test(id, name, expected, fn) {
  let ok = false, actual = '';
  try { [ok, actual] = await fn(); } catch (e) { actual = 'Lỗi: ' + e.message; }
  results.push({ id, name, expected, actual, ok });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '} ${id}  ${name}  ->  ${actual}`);
}
const stockOf = async (id) => Number((await call('GET', `/products/${id}`)).data.data.stock);
const ship = { address: '12 Thái Hà, Đống Đa, Hà Nội', nguoiNhan: 'Khách kiểm thử', sdtNhan: '0912345678', phuongThucThanhToan: 'cod' };

(async () => {
  const login = async ([u, p]) => (await call('POST', '/auth/login', { username: u, password: p })).data.token;
  let K, N, A;

  // ---- Xác thực, phân quyền ----
  await test('T01', 'Đăng nhập đúng tài khoản khách hàng', 'Trả về JWT', async () => {
    K = await login(ACC.customer); N = await login(ACC.staff); A = await login(ACC.admin);
    return [!!(K && N && A), K ? 'Nhận được token' : 'Không có token'];
  });
  await test('T02', 'Đăng nhập sai mật khẩu', 'Từ chối', async () => {
    const r = await call('POST', '/auth/login', { username: ACC.customer[0], password: 'sai-mat-khau' });
    return [r.data.success === false && !r.data.token, r.data.message || r.status];
  });
  await test('T03', 'Gọi route đăng ký cũ không OTP', 'HTTP 404', async () => {
    const r = await call('POST', '/auth/register', { username: 'x', password: 'y' });
    return [r.status === 404, 'HTTP ' + r.status];
  });
  await test('T04', 'Gọi API đơn hàng khi chưa đăng nhập', 'HTTP 401', async () => {
    const r = await call('GET', '/orders');
    return [r.status === 401, 'HTTP ' + r.status];
  });
  await test('T05', 'Khách hàng gọi API dashboard quản trị', 'HTTP 403', async () => {
    const r = await call('GET', '/admin/dashboard', null, K);
    return [r.status === 403, 'HTTP ' + r.status];
  });
  await test('T06', 'Nhân viên gọi API quản lý nhân viên', 'HTTP 403 (chỉ Admin)', async () => {
    const r = await call('GET', '/employees', null, N);
    return [r.status === 403, 'HTTP ' + r.status];
  });

  // ---- Sản phẩm, mã giảm giá ----
  const list = (await call('GET', '/products')).data.data;
  const prods = list.filter((p) => Number(p.stock) >= 6);
  const P1 = prods[0].id, P2 = prods[1].id, P3 = prods[2].id;
  await test('T07', 'Tìm kiếm sản phẩm theo tên', 'Có kết quả phù hợp', async () => {
    const kw = 'Abbey';
    const r = await call('GET', '/products?search=' + encodeURIComponent(kw));
    return [r.data.data.length > 0, `${r.data.data.length} sản phẩm cho "${kw}"`];
  });
  await test('T08', 'Kiểm tra mã giảm giá hợp lệ (WELCOME10, đơn 1.000.000đ)', 'Giảm 100.000đ', async () => {
    const r = await call('POST', '/discounts/check', { code: 'WELCOME10', cartTotal: 1000000 }, K);
    return [r.data.success && Number(r.data.data.discountAmount) === 100000, r.data.message + ' ' + (r.data.data?.discountAmount ?? '')];
  });
  await test('T09', 'Mã giảm giá không tồn tại', 'Từ chối', async () => {
    const r = await call('POST', '/discounts/check', { code: 'KHONGCO', cartTotal: 1000000 }, K);
    return [r.data.success === false, r.data.message];
  });
  await test('T10', 'Mã giảm giá chưa đạt giá trị tối thiểu (VINYL50, đơn 100.000đ)', 'Từ chối', async () => {
    const r = await call('POST', '/discounts/check', { code: 'VINYL50', cartTotal: 100000 }, K);
    return [r.data.success === false, r.data.message];
  });

  // ---- Đặt hàng, hủy đơn ----
  let o1, o2, o3;
  await test('T11', 'Khách đặt đơn COD 2 sản phẩm', 'Tạo đơn, tồn kho giảm 2', async () => {
    const s0 = await stockOf(P1);
    const r = await call('POST', '/orders', { ...ship, items: [{ id: P1, qty: 2 }] }, K);
    o1 = r.data.order_id; const s1 = await stockOf(P1);
    return [r.data.success && s1 === s0 - 2, `Đơn #${o1}, tồn kho ${s0} → ${s1}`];
  });
  await test('T12', 'Đặt số lượng vượt tồn kho', 'HTTP 409', async () => {
    const r = await call('POST', '/orders', { ...ship, items: [{ id: P2, qty: 99 }] }, K);
    return [r.status === 409, 'HTTP ' + r.status + ' ' + (r.data.message || '')];
  });
  await test('T13', 'Đặt hàng thiếu thông tin người nhận', 'HTTP 400', async () => {
    const r = await call('POST', '/orders', { ...ship, nguoiNhan: '', items: [{ id: P2, qty: 1 }] }, K);
    return [r.status === 400, 'HTTP ' + r.status];
  });
  await test('T14', 'NV chuyển đơn choxacnhan → dangchuanbihang (bỏ qua bước)', 'Cho phép', async () => {
    const r = await call('PUT', `/orders/${o1}/status`, { status: 'dangchuanbihang' }, N);
    return [r.data.success === true, r.data.message];
  });
  await test('T15', 'NV chuyển ngược dangchuanbihang → choxacnhan', 'Từ chối', async () => {
    const r = await call('PUT', `/orders/${o1}/status`, { status: 'choxacnhan' }, N);
    return [r.status === 400, r.data.message];
  });
  await test('T16', 'NV hủy đơn bằng cập nhật trạng thái', 'dahuy, hoàn tồn kho', async () => {
    const s0 = await stockOf(P1);
    const r = await call('PUT', `/orders/${o1}/status`, { status: 'dahuy' }, N);
    const s1 = await stockOf(P1);
    return [r.data.success && s1 === s0 + 2, `${r.data.message}, tồn kho ${s0} → ${s1}`];
  });
  await test('T17', 'Chuyển đơn đã hủy sang hoanthanh', 'Từ chối', async () => {
    const r = await call('PUT', `/orders/${o1}/status`, { status: 'hoanthanh' }, A);
    return [r.status === 400, r.data.message];
  });
  await test('T18', 'Khách tự hủy đơn đang chờ xác nhận', 'Hủy thành công, hoàn tồn kho', async () => {
    o2 = (await call('POST', '/orders', { ...ship, items: [{ id: P2, qty: 1 }] }, K)).data.order_id;
    const s0 = await stockOf(P2);
    const r = await call('PUT', `/orders/${o2}/cancel`, {}, K);
    const s1 = await stockOf(P2);
    return [r.data.success && s1 === s0 + 1, `${r.data.message} Tồn kho ${s0} → ${s1}`];
  });
  await test('T19', 'Khách hủy đơn đang giao', 'Từ chối', async () => {
    o3 = (await call('POST', '/orders', { ...ship, items: [{ id: P3, qty: 1 }] }, K)).data.order_id;
    await call('PUT', `/orders/${o3}/status`, { status: 'danggiaohang' }, N);
    const r = await call('PUT', `/orders/${o3}/cancel`, {}, K);
    return [r.data.success !== true, r.data.message];
  });

  // ---- Trả hàng ----
  await test('T20', 'Yêu cầu trả hàng khi đơn chưa hoàn thành', 'HTTP 400', async () => {
    const r = await call('POST', '/returns', { order_id: o3, reason: 'hang_loi', description: 'Đĩa bị xước' }, K);
    return [r.status === 400, r.data.message];
  });
  await test('T21', 'Yêu cầu trả hàng cho đơn đã hoàn thành (trong 7 ngày)', 'Tạo yêu cầu', async () => {
    await call('PUT', `/orders/${o3}/status`, { status: 'hoanthanh' }, N);
    const r = await call('POST', '/returns', { order_id: o3, reason: 'hang_loi', description: 'Đĩa bị xước' }, K);
    return [r.data.success === true, r.data.message];
  });

  // ---- Nhập kho ----
  await test('T22', 'Nhập kho số lượng âm (-5)', 'HTTP 400, tồn kho không đổi', async () => {
    const s0 = await stockOf(P3);
    const r = await call('POST', '/admin/import-stock', { items: [{ id: P3, qty: -5, price: 100000 }] }, N);
    const s1 = await stockOf(P3);
    return [r.status === 400 && s0 === s1, r.data.message];
  });
  await test('T23', 'Nhập kho mã sản phẩm không tồn tại', 'HTTP 400', async () => {
    const r = await call('POST', '/admin/import-stock', { items: [{ id: 999999, qty: 5, price: 100000 }] }, N);
    return [r.status === 400, r.data.message];
  });
  await test('T24', 'Nhập kho hợp lệ 3 sản phẩm', 'Tạo phiếu nhập, tồn kho +3', async () => {
    const s0 = await stockOf(P3);
    const r = await call('POST', '/admin/import-stock', { items: [{ id: P3, qty: 3, price: 100000 }], note: 'Kiểm thử' }, N);
    const s1 = await stockOf(P3);
    return [r.data.success && s1 === s0 + 3, `Phiếu #${r.data.phieu_nhap_id}, tồn kho ${s0} → ${s1}`];
  });

  // ---- Báo cáo, sản phẩm, yêu thích ----
  await test('T25', 'Báo cáo doanh thu theo khoảng ngày', 'Trả doanh thu theo ngày', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const r = await call('GET', `/admin/revenue-report?start=2026-01-01&end=${today}`, null, N);
    return [r.data.success && Array.isArray(r.data.data), `${r.data.data.length} ngày có doanh thu`];
  });
  await test('T26', 'Thêm sản phẩm vào danh sách yêu thích', 'Thành công', async () => {
    await call('DELETE', '/wishlist', { product_id: P2 }, K);
    const r = await call('POST', '/wishlist', { product_id: P2 }, K);
    return [r.data.success === true, r.data.message || 'OK'];
  });
  const victim = list.filter((p) => Number(p.stock) >= 1).slice(-1)[0].id;
  await test('T27', 'Xóa sản phẩm (xóa mềm)', 'Ngừng kinh doanh, ẩn khỏi cửa hàng', async () => {
    const before = (await call('GET', '/products')).data.data.length;
    const r = await call('DELETE', `/products/${victim}`, null, A);
    const after = (await call('GET', '/products')).data.data.length;
    return [r.data.success && after === before - 1, `${r.data.message}; ${before} → ${after} sản phẩm hiển thị`];
  });
  await test('T28', 'Đặt mua sản phẩm đã ngừng kinh doanh', 'HTTP 409', async () => {
    const r = await call('POST', '/orders', { ...ship, items: [{ id: victim, qty: 1 }] }, K);
    return [r.status === 409, r.data.message];
  });

  const pass = results.filter((r) => r.ok).length;
  console.log(`\nKết quả: ${pass}/${results.length} ca đạt`);
  require('fs').writeFileSync(__dirname + '/api-test-result.json', JSON.stringify(results, null, 2));
  process.exit(pass === results.length ? 0 : 1);
})();
