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
  customer: [process.env.CUSTOMER_USER || 'khach1@vocrecord.local', process.env.CUSTOMER_PASS || 'Demo@123'],
  staff: [process.env.STAFF_USER || 'nhanvien.demo', process.env.STAFF_PASS || 'Demo@123'],
  admin: [process.env.ADMIN_USER || 'admin.demo', process.env.ADMIN_PASS || 'Demo@123'],
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

  // ---- Thanh toán, mã giảm giá, hồ sơ ----
  const orderInfo = async (id) => (await call('GET', `/orders/${id}`, null, A)).data.data.info;
  const usageOf = async (code) => Number((await call('GET', '/discounts', null, A)).data.data.find((d) => d.Code === code).DaDung);
  await test('T29', 'Đơn COD hoàn thành được ghi nhận đã thanh toán', 'TrangThaiTT = dathanhtoan', async () => {
    const info = await orderInfo(o3);
    return [info.TrangThai === 'hoanthanh' && info.TrangThaiTT === 'dathanhtoan', `${info.TrangThai} / ${info.TrangThaiTT}`];
  });
  await test('T30', 'Hủy đơn có mã giảm giá trả lại lượt dùng mã', 'DaDung +1 rồi -1', async () => {
    const u0 = await usageOf('WELCOME10');
    const id = (await call('POST', '/orders', { ...ship, discountCode: 'WELCOME10', items: [{ id: P2, qty: 1 }] }, K)).data.order_id;
    const u1 = await usageOf('WELCOME10');
    await call('PUT', `/orders/${id}/cancel`, {}, K);
    const u2 = await usageOf('WELCOME10');
    return [u1 === u0 + 1 && u2 === u0, `Lượt dùng ${u0} → ${u1} → ${u2}`];
  });
  await test('T31', 'Danh sách đơn của khách có trạng thái thanh toán', 'Có TrangThaiTT', async () => {
    const r = await call('GET', '/orders', null, K);
    return [r.data.data.length > 0 && r.data.data.every((o) => 'TrangThaiTT' in o), `${r.data.data.length} đơn`];
  });
  await test('T32', 'Xóa sản phẩm khỏi danh sách yêu thích', 'Không còn trong danh sách', async () => {
    const r = await call('DELETE', '/wishlist', { product_id: P2 }, K);
    const list = (await call('GET', '/wishlist', null, K)).data.data;
    return [r.data.success && !list.some((item) => item.id === P2), r.data.message];
  });
  await test('T33', 'Danh sách khách hàng trả về tên và email', 'Có id, name, email', async () => {
    const c = (await call('GET', '/admin/customers', null, N)).data.data[0];
    return [Boolean(c && c.id && c.name && c.email), c ? `${c.name} <${c.email}>` : 'Trống'];
  });
  await test('T34', 'Cập nhật hồ sơ không xóa địa chỉ đã lưu', 'Địa chỉ giữ nguyên', async () => {
    await call('PUT', '/account/profile', { fullName: 'Khách CI', phone: '0900000001', address: '1 Phố Huế, Hà Nội' }, K);
    await call('PUT', '/account/profile', { fullName: 'Khách CI', phone: '0900000001' }, K);
    const address = (await call('GET', '/account/profile', null, K)).data.data.address;
    return [address === '1 Phố Huế, Hà Nội', `Địa chỉ: ${address}`];
  });
  await test('T35', 'Sửa mã giảm giá để trống ngày hết hạn', 'Lưu được', async () => {
    const code = 'CI' + Date.now().toString().slice(-6);
    await call('POST', '/discounts', { Code: code, LoaiGiamGia: 'fixed', GiaTri: 10000, DonHangToiThieu: 0, SoLuong: 5, NgayHetHan: '' }, A);
    const created = (await call('GET', '/discounts', null, A)).data.data.find((d) => d.Code === code);
    const r = await call('PUT', `/discounts/${created.MaGG}`, { Code: code, LoaiGiamGia: 'fixed', GiaTri: 20000, DonHangToiThieu: 0, SoLuong: 5, NgayHetHan: '' }, A);
    await call('DELETE', `/discounts/${created.MaGG}`, null, A);
    return [r.data.success === true, r.data.message];
  });

  // ---- Vận chuyển GHN (chưa cấu hình GHN nên dùng mã giả lập) ----
  const ghnWebhook = (code, status) => call('POST', '/shipping/webhook/ghn', { OrderCode: code, Status: status });
  let shipped, shipCode;
  await test('T36', 'Tạo vận đơn chuyển đơn sang "Đang chuẩn bị", giữ phí ship khách đã trả', 'dangchuanbihang, phí 30.000đ', async () => {
    shipped = (await call('POST', '/orders', { ...ship, items: [{ id: P2, qty: 1 }] }, K)).data.order_id;
    await call('PUT', `/orders/${shipped}/status`, { status: 'daxacnhan' }, N);
    const r = await call('POST', `/shipping/orders/${shipped}/create`, {}, N);
    shipCode = r.data.data?.order_code;
    const info = await orderInfo(shipped);
    return [r.data.success && info.TrangThai === 'dangchuanbihang' && Number(info.PhiVanChuyen) === 30000, `${shipCode} · ${info.TrangThai} · phí ${Number(info.PhiVanChuyen)}`];
  });
  await test('T37', 'Tạo vận đơn lần 2 cho cùng đơn', 'HTTP 409', async () => {
    const r = await call('POST', `/shipping/orders/${shipped}/create`, {}, N);
    return [r.status === 409, r.data.message];
  });
  await test('T38', 'GHN báo money_collect_delivering', 'Đang giao (chưa hoàn thành)', async () => {
    await ghnWebhook(shipCode, 'money_collect_delivering');
    const info = await orderInfo(shipped);
    return [info.TrangThai === 'danggiaohang', info.TrangThai];
  });
  await test('T39', 'GHN báo delivered', 'Hoàn thành, COD đã thanh toán', async () => {
    await ghnWebhook(shipCode, 'delivered');
    const info = await orderInfo(shipped);
    return [info.TrangThai === 'hoanthanh' && info.TrangThaiTT === 'dathanhtoan', `${info.TrangThai} / ${info.TrangThaiTT}`];
  });
  await test('T40', 'GHN gửi lại trạng thái cũ sau khi đã hoàn thành', 'Giữ nguyên hoàn thành', async () => {
    await ghnWebhook(shipCode, 'ready_to_pick');
    const info = await orderInfo(shipped);
    return [info.TrangThai === 'hoanthanh', `${info.TrangThai} (GHN: ${info.GHNTrangThai})`];
  });
  await test('T41', 'GHN báo hủy vận đơn', 'Đã hủy, hoàn tồn kho', async () => {
    const id = (await call('POST', '/orders', { ...ship, items: [{ id: P2, qty: 1 }] }, K)).data.order_id;
    await call('PUT', `/orders/${id}/status`, { status: 'daxacnhan' }, N);
    const code = (await call('POST', `/shipping/orders/${id}/create`, {}, N)).data.data.order_code;
    const s0 = await stockOf(P2);
    await ghnWebhook(code, 'cancel');
    const s1 = await stockOf(P2);
    const info = await orderInfo(id);
    return [info.TrangThai === 'dahuy' && s1 === s0 + 1, `${info.TrangThai}, tồn kho ${s0} → ${s1}`];
  });
  await test('T42', 'Đăng nhập đúng nhiều lần liên tiếp', 'Không bị khóa 15 phút', async () => {
    let token;
    for (let i = 0; i < 12; i += 1) token = await login(ACC.customer);
    return [Boolean(token), token ? 'Lần thứ 12 vẫn đăng nhập được' : 'Bị chặn'];
  });

  // ---- Tìm kiếm thông minh, trợ lý AI ----
  // Đạt cả khi mô hình ngữ nghĩa chưa tải được (tìm kiếm tự lùi về từ khóa).
  const search = async (q, extra = '') => (await call('GET', `/search?q=${encodeURIComponent(q)}${extra}`)).data;
  const textModelReady = (await call('GET', '/search/status')).data.data?.models.text.status === 'ready';
  await test('T43', 'Tìm "nhạc buồn nghe lúc mưa, dưới 800k"', 'Có kết quả, đều ≤ 800.000đ, chỉ đĩa nhạc', async () => {
    const d = (await search('nhạc buồn nghe lúc mưa, dưới 800k')).data;
    const prices = d.results.map((p) => Number(p.price));
    const musicOnly = d.results.every((p) => /vinyl|cassette/i.test(p.category));
    const semanticOk = !textModelReady || d.semantic.used;
    return [d.results.length > 0 && prices.every((p) => p <= 800000) && musicOnly && semanticOk,
      `${d.results.length} kết quả, cao nhất ${Math.max(...prices)}đ, ngữ nghĩa: ${d.semantic.used ? 'có' : 'không'} (${d.understood.chips.map((c) => c.label).join(', ')})`];
  });
  await test('T44', 'Tìm không dấu "nhac buon nghe luc mua duoi 800k"', 'Hiểu giá như câu có dấu', async () => {
    const d = (await search('nhac buon nghe luc mua duoi 800k')).data;
    return [d.results.length > 0 && d.understood.filters.maxPrice === 800000 && d.results.every((p) => Number(p.price) <= 800000),
      `${d.results.length} kết quả, maxPrice=${d.understood.filters.maxPrice}`];
  });
  await test('T45', 'Tìm chỉ có điều kiện "cassette dưới 450k"', 'Toàn cassette ≤ 450.000đ, rẻ trước', async () => {
    const d = (await search('cassette dưới 450k')).data;
    const prices = d.results.map((p) => Number(p.price));
    const sorted = prices.every((p, i) => i === 0 || prices[i - 1] <= p);
    return [d.results.length > 0 && d.results.every((p) => /cassette/i.test(p.category) && Number(p.price) <= 450000) && sorted,
      `${d.results.length} cassette: ${prices.join(', ')}`];
  });
  await test('T46', 'Tìm kèm tham số max_price, category', 'Áp dụng điều kiện có cấu trúc', async () => {
    const d = (await search('jazz', '&max_price=850000&category=vinyl')).data;
    return [d.results.length > 0 && d.results.every((p) => Number(p.price) <= 850000 && /vinyl/i.test(p.category)),
      d.understood.chips.map((c) => c.label).join(', ') + ` · ${d.results.map((p) => p.title).join(', ')}`];
  });
  await test('T47', 'Tìm kiếm để trống', 'HTTP 400', async () => {
    const r = await call('GET', '/search?q=');
    return [r.status === 400, `HTTP ${r.status} ${r.data.message || ''}`];
  });
  await test('T48', 'Tìm bằng ảnh với vector sai kích thước', 'HTTP 400', async () => {
    const r = await call('POST', '/search/image', { vector: [1, 2, 3] });
    return [r.status === 400, `HTTP ${r.status} ${r.data.message || ''}`];
  });
  await test('T49', 'Trợ lý AI: chưa cấu hình thì báo rõ, tin nhắn sai thì từ chối', 'HTTP 503 AI_NOT_CONFIGURED hoặc 400', async () => {
    const enabled = (await call('GET', '/assistant/status')).data.data.enabled;
    const r = enabled
      ? await call('POST', '/assistant/chat', { messages: [{ role: 'assistant', content: 'x' }] })
      : await call('POST', '/assistant/chat', { messages: [{ role: 'user', content: 'chào' }] });
    const ok = enabled ? r.status === 400 : r.status === 503 && r.data.code === 'AI_NOT_CONFIGURED';
    return [ok, `${enabled ? 'đã bật' : 'chưa bật'} · HTTP ${r.status} ${r.data.code || r.data.message || ''}`];
  });
  await test('T50', 'Quản trị viên sửa từ khóa AI của sản phẩm', 'Lưu được, tìm theo từ khóa mới ra sản phẩm', async () => {
    const id = (await call('GET', '/products?limit=1')).data.data[0].id;
    const product = (await call('GET', `/products/${id}`)).data.data;
    const keyword = 'kiemthutukhoaai';
    await call('PUT', `/products/${id}`, { ...product, ai_keywords: `${product.ai_keywords || ''}, ${keyword}` }, A);
    const saved = (await call('GET', `/products/${id}`)).data.data.ai_keywords || '';
    const found = (await search(keyword, '&mode=keyword')).data.results.some((p) => p.id === id);
    await call('PUT', `/products/${id}`, { ...product }, A); // trả lại như cũ
    return [saved.includes(keyword) && found, `lưu: ${saved.includes(keyword) ? 'có' : 'không'}, tìm thấy: ${found ? 'có' : 'không'}`];
  });

  // ---- Thu mua & ký gửi đĩa cũ, ví tín dụng ----
  // Không gọi AI: chỉ kiểm tra chính sách, phân quyền, kiểm tra dữ liệu vào và ví.
  await test('T51', 'Xem chính sách thu mua (công khai)', 'Có thang Goldmine 7 mức và tỷ lệ hoa hồng', async () => {
    const d = (await call('GET', '/tradein/policy')).data.data;
    return [d.grades.length === 7 && d.grades[0].code === 'M' && d.commissionRate > 0 && d.buyoutRate > 0,
      `${d.grades.map((g) => g.code).join(' ')} · thu mua ${d.buyoutRate * 100}% · hoa hồng ${d.commissionRate * 100}%`];
  });
  await test('T52', 'Gửi tệp không phải ảnh để thẩm định', 'HTTP 400', async () => {
    const r = await call('POST', '/tradein/items', { title: 'Kiểm thử', photos: ['data:image/png;base64,aGVsbG8='] }, K);
    return [r.status === 400, `HTTP ${r.status} ${r.data.message || ''}`];
  });
  await test('T53', 'Gửi yêu cầu thu mua không có đĩa', 'HTTP 400', async () => {
    const r = await call('POST', '/tradein', { item_ids: [] }, K);
    return [r.status === 400, `HTTP ${r.status} ${r.data.message || ''}`];
  });
  await test('T54', 'Khách xem danh sách thu mua của cửa hàng', 'HTTP 403', async () => {
    const r = await call('GET', '/tradein/manage', null, K);
    return [r.status === 403, `HTTP ${r.status}`];
  });
  await test('T55', 'Khách xem ví tín dụng', 'Có số dư và lịch sử', async () => {
    const d = (await call('GET', '/tradein/wallet', null, K)).data.data;
    return [typeof d.balance === 'number' && Array.isArray(d.history), `số dư ${d.balance}đ · ${d.history.length} giao dịch`];
  });
  await test('T56', 'Nhân viên xem báo cáo thu mua, ký gửi', 'Có số liệu thu mua, ký gửi, tín dụng, độ khớp AI', async () => {
    const d = (await call('GET', '/tradein/report', null, N)).data.data;
    return [Boolean(d.buyout && d.consignment && d.credit && d.ai_accuracy),
      `thu mua ${d.buyout.items} đĩa · ký gửi đang bán ${d.consignment.selling} · tín dụng ${d.credit.outstanding}đ`];
  });

  // ---- Hồi quy các lỗi nghiệp vụ đã sửa (kiểm thử nghiệp vụ 22/10/2026) ----
  const inStockProduct = async () => (await call('GET', '/products?limit=100')).data.data.find((p) => Number(p.stock) > 2 && p.item_type !== 'cu');
  await test('T57', 'Tạo mã giảm giá 150%', 'HTTP 400 (tối đa 100%)', async () => {
    const r = await call('POST', '/discounts', { Code: `QA150${Date.now() % 100000}`, LoaiGiamGia: 'percent', GiaTri: 150 }, A);
    return [r.status === 400, `HTTP ${r.status} ${r.data.message || ''}`];
  });
  await test('T58', 'Đặt hàng với mã giảm giá đã hết hạn', 'HTTP 409, báo mã hết hạn', async () => {
    const code = `QAEXP${Date.now() % 100000}`;
    await call('POST', '/discounts', { Code: code, LoaiGiamGia: 'percent', GiaTri: 10, NgayHetHan: '2020-01-01' }, A);
    const { id } = await inStockProduct();
    const r = await call('POST', '/orders', { ...ship, items: [{ id, qty: 1 }], discountCode: code }, K);
    if (r.data.order_id) await call('PUT', `/orders/${r.data.order_id}/cancel`, {}, K);
    return [r.status === 409 && /hết hạn/.test(r.data.message || ''), `HTTP ${r.status} ${r.data.message || ''}`];
  });
  await test('T59', 'Sửa sản phẩm chỉ gửi tên', 'Giá và tồn kho giữ nguyên', async () => {
    const product = await inStockProduct();
    await call('PUT', `/products/${product.id}`, { title: product.title }, A);
    const after = (await call('GET', `/products/${product.id}`)).data.data;
    return [Number(after.price) === Number(product.price) && Number(after.stock) === Number(product.stock),
      `giá ${Number(product.price)} -> ${Number(after.price)} · tồn ${product.stock} -> ${after.stock}`];
  });
  await test('T60', 'Tạo sản phẩm giá 0đ, tồn kho âm', 'HTTP 400', async () => {
    const r = await call('POST', '/products', { title: 'Kiểm thử giá 0', price: 0, stock: -1 }, A);
    return [r.status === 400, `HTTP ${r.status} ${r.data.message || ''}`];
  });
  await test('T61', 'Đặt hàng với số điện thoại người nhận sai', 'HTTP 400', async () => {
    const { id } = await inStockProduct();
    const r = await call('POST', '/orders', { ...ship, sdtNhan: '12345', items: [{ id, qty: 1 }] }, K);
    if (r.data.order_id) await call('PUT', `/orders/${r.data.order_id}/cancel`, {}, K);
    return [r.status === 400, `HTTP ${r.status} ${r.data.message || ''}`];
  });
  await test('T62', 'Admin khóa khách đang đăng nhập', 'Phiên của khách bị chặn ngay (HTTP 401), mở khóa thì dùng lại được', async () => {
    const customer = (await call('GET', '/admin/customers', null, A)).data.data.find((c) => c.email === 'khach2@vocrecord.local');
    if (!customer) return [true, 'bỏ qua: không có tài khoản khach2@vocrecord.local'];
    const token = await login(['khach2@vocrecord.local', ACC.customer[1]]);
    await call('PUT', `/admin/customers/${customer.id}/status`, { active: false }, A);
    const locked = await call('GET', '/account/profile', null, token);
    await call('PUT', `/admin/customers/${customer.id}/status`, { active: true }, A);
    const unlocked = await call('GET', '/account/profile', null, token);
    return [locked.status === 401 && unlocked.status === 200, `khi khóa HTTP ${locked.status} · mở khóa HTTP ${unlocked.status}`];
  });

  const pass = results.filter((r) => r.ok).length;
  console.log(`\nKết quả: ${pass}/${results.length} ca đạt`);
  require('fs').writeFileSync(__dirname + '/api-test-result.json', JSON.stringify(results, null, 2));
  process.exit(pass === results.length ? 0 : 1);
})();
