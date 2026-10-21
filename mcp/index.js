#!/usr/bin/env node
// MCP server (stdio) của Vọc Records: cho Claude Desktop (hoặc ứng dụng MCP khác) tìm đĩa,
// xem chi tiết, xem trước và đặt đơn COD, theo dõi đơn hàng, thông qua REST API của cửa hàng.
// Cấu hình bằng biến môi trường (xem mcp/README.md):
//   VOC_API_URL   gốc API, mặc định http://localhost:8080/api (Docker) — production: https://ngtiendat.id.vn/api
//   VOC_USERNAME  tài khoản khách hàng dùng để đặt hàng (không cần nếu chỉ tìm kiếm)
//   VOC_PASSWORD
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_URL = (process.env.VOC_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
const SITE_URL = (process.env.VOC_SITE_URL || API_URL.replace(/\/api$/, '')).replace(/\/+$/, '');
const USERNAME = process.env.VOC_USERNAME || '';
const PASSWORD = process.env.VOC_PASSWORD || '';
const SHIPPING_FEE = 30000; // phí GHN đồng giá, khớp server/src/routes/order.routes.js

const ORDER_STATUS = {
  choxacnhan: 'Chờ xác nhận',
  daxacnhan: 'Đã xác nhận',
  dangchuanbihang: 'Đang chuẩn bị hàng',
  danggiaohang: 'Đang giao',
  hoanthanh: 'Hoàn thành',
  dahuy: 'Đã hủy',
};

let token = null;

async function request(path, { method = 'GET', body, auth = false, retried = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    if (!token) await login();
    headers.Authorization = `Bearer ${token}`;
  }
  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    throw new Error(`Không kết nối được tới ${API_URL} (${error.message}). Kiểm tra VOC_API_URL và server Vọc Records.`);
  }
  // Token hết hạn: đăng nhập lại một lần.
  if (auth && response.status === 401 && !retried) {
    token = null;
    return request(path, { method, body, auth, retried: true });
  }
  const data = await response.json().catch(() => ({ success: false, message: `HTTP ${response.status}` }));
  if (!response.ok && data.success === undefined) data.success = false;
  return data;
}

async function login() {
  if (!USERNAME || !PASSWORD) {
    throw new Error('Chưa cấu hình tài khoản: đặt VOC_USERNAME và VOC_PASSWORD (tài khoản khách hàng Vọc Records) trong cấu hình MCP của Claude Desktop.');
  }
  const data = await request('/auth/login', { method: 'POST', body: { username: USERNAME, password: PASSWORD } });
  if (!data.success || !data.token) throw new Error(`Đăng nhập Vọc Records thất bại: ${data.message || 'không rõ lý do'}`);
  if (!data.user || !data.user.customer_id) throw new Error('Tài khoản này không phải tài khoản khách hàng nên không đặt hàng được.');
  token = data.token;
}

const vnd = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')}đ`;
const productUrl = (id) => `${SITE_URL}/#/product/${id}`;
const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
const failure = (message) => ({ content: [{ type: 'text', text: message }], isError: true });
// Lỗi (mạng, đăng nhập, dữ liệu) trả về cho Claude dưới dạng kết quả lỗi để nó giải thích cho người dùng.
const safe = (handler) => async (args) => {
  try {
    return await handler(args);
  } catch (error) {
    return failure(error.message);
  }
};

const itemsSchema = z.array(z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10).default(1),
})).min(1).max(20);

async function resolveAddress(addressId) {
  const data = await request('/account/addresses', { auth: true });
  if (!data.success) throw new Error(data.message || 'Không lấy được sổ địa chỉ');
  const addresses = data.data || [];
  if (addresses.length === 0) {
    throw new Error(`Tài khoản chưa có địa chỉ giao hàng. Hãy thêm địa chỉ tại ${SITE_URL}/#/account?tab=addresses rồi thử lại.`);
  }
  const address = addressId
    ? addresses.find((a) => a.MaDC === addressId)
    : addresses.find((a) => a.MacDinh === 1) || addresses[0];
  if (!address) throw new Error(`Không có địa chỉ #${addressId} trong sổ địa chỉ.`);
  return address;
}

const describeAddress = (a) => `${a.NguoiNhan} · ${a.SoDienThoai} · ${[a.DiaChi, a.GHNPhuong, a.GHNTinh].filter(Boolean).join(', ')}`;

// Tính trước đơn hàng bằng giá và tồn kho hiện tại trên server (server vẫn tự tính lại khi tạo đơn).
async function buildQuote(items, discountCode) {
  const lines = [];
  for (const { product_id: id, quantity } of items) {
    const data = await request(`/products/${id}`);
    if (!data.success || !data.data) throw new Error(`Không tìm thấy sản phẩm #${id}`);
    const p = data.data;
    if (p.status === 'ngungkinhdoanh') throw new Error(`"${p.title}" đã ngừng kinh doanh`);
    if (Number(p.stock) < quantity) throw new Error(`"${p.title}" chỉ còn ${Number(p.stock)} sản phẩm`);
    lines.push({ id: p.id, title: p.title, artist: p.artist, quantity, unit_price: Number(p.price), line_total: Number(p.price) * quantity });
  }
  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
  let discount = 0;
  let discountNote = null;
  if (discountCode) {
    const check = await request('/discounts/check', { method: 'POST', body: { code: discountCode, cartTotal: subtotal } });
    if (check.success) discount = Number(check.data.discountAmount) || 0;
    else discountNote = `Mã ${discountCode} không áp dụng được: ${check.message}`;
  }
  return { lines, subtotal, discount, discountNote, shipping: SHIPPING_FEE, total: Math.max(subtotal - discount, 0) + SHIPPING_FEE };
}

const server = new McpServer(
  { name: 'vocrecord', version: '1.0.0' },
  {
    instructions: 'Vọc Records là cửa hàng đĩa than, cassette, mâm đĩa và phụ kiện analog ở Hà Nội. '
      + 'Dùng search_products để tìm (hiểu được mô tả tâm trạng và ngân sách). Trước khi đặt hàng luôn gọi preview_order, '
      + 'cho người dùng xem sản phẩm, địa chỉ và tổng tiền, và chỉ gọi place_order sau khi họ đồng ý rõ ràng. '
      + 'Đơn đặt qua đây thanh toán khi nhận hàng (COD).',
  },
);

server.registerTool('search_products', {
  title: 'Tìm sản phẩm',
  description: 'Tìm sản phẩm đang bán ở Vọc Records bằng tìm kiếm kết hợp từ khóa và ngữ nghĩa. Hiểu mô tả tự nhiên như "nhạc buồn nghe lúc mưa, dưới 800k". Trả về id, tên, nghệ sĩ, giá, tồn kho, từ khóa tâm trạng và đường dẫn sản phẩm.',
  inputSchema: {
    query: z.string().min(1).max(300).describe('Nhu cầu bằng lời tự nhiên: thể loại, tâm trạng, nghệ sĩ, tên album...'),
    max_price: z.number().positive().optional().describe('Giá tối đa (VND)'),
    min_price: z.number().positive().optional().describe('Giá tối thiểu (VND)'),
    category: z.enum(['vinyl', 'cassette', 'turntable', 'accessory']).optional().describe('vinyl = đĩa than, cassette, turntable = mâm đĩa, accessory = phụ kiện'),
    in_stock_only: z.boolean().optional(),
    limit: z.number().int().min(1).max(20).optional().describe('Mặc định 8'),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
}, safe(async ({ query, max_price: maxPrice, min_price: minPrice, category, in_stock_only: inStock, limit = 8 }) => {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (maxPrice) params.set('max_price', String(maxPrice));
  if (minPrice) params.set('min_price', String(minPrice));
  if (category) params.set('category', category);
  if (inStock) params.set('in_stock', '1');
  const data = await request(`/search?${params}`);
  if (!data.success) return failure(data.message || 'Tìm kiếm thất bại');
  const { results, understood } = data.data;
  return text({
    understood: understood.chips.map((chip) => chip.label),
    results: results.map((p) => ({
      id: p.id,
      title: p.title,
      artist: p.artist,
      category: p.category,
      genre: p.music_genre,
      price: vnd(p.price),
      in_stock: Number(p.stock),
      mood: p.ai_keywords,
      description: p.description,
      url: productUrl(p.id),
    })),
  });
}));

server.registerTool('get_product', {
  title: 'Xem chi tiết sản phẩm',
  description: 'Xem chi tiết một sản phẩm theo id: tracklist, định dạng, tình trạng bìa/đĩa, quy cách, năm phát hành, giá, tồn kho.',
  inputSchema: { product_id: z.number().int().positive() },
  annotations: { readOnlyHint: true, openWorldHint: true },
}, safe(async ({ product_id: id }) => {
  const data = await request(`/products/${id}`);
  if (!data.success || !data.data) return failure(`Không tìm thấy sản phẩm #${id}`);
  const p = data.data;
  return text({
    id: p.id, title: p.title, artist: p.artist, category: p.category, genre: p.music_genre,
    price: vnd(p.price), in_stock: Number(p.stock), status: p.status, format: p.format, condition: p.condition,
    package_info: p.package_info, year: p.year, tracklist: p.tracklist, description: p.description, url: productUrl(p.id),
  });
}));

server.registerTool('list_my_addresses', {
  title: 'Sổ địa chỉ',
  description: 'Liệt kê địa chỉ giao hàng đã lưu của tài khoản đang cấu hình (VOC_USERNAME).',
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: true },
}, safe(async () => {
  const data = await request('/account/addresses', { auth: true });
  if (!data.success) return failure(data.message || 'Không lấy được sổ địa chỉ');
  return text((data.data || []).map((a) => ({ address_id: a.MaDC, default: a.MacDinh === 1, address: describeAddress(a) })));
}));

server.registerTool('preview_order', {
  title: 'Xem trước đơn hàng',
  description: 'Tính trước đơn hàng (không đặt): kiểm tra tồn kho, giá hiện tại, mã giảm giá, phí vận chuyển và địa chỉ sẽ giao. Luôn gọi trước place_order và cho người dùng xem kết quả.',
  inputSchema: {
    items: itemsSchema.describe('Danh sách { product_id, quantity }'),
    address_id: z.number().int().positive().optional().describe('Bỏ trống để dùng địa chỉ mặc định'),
    discount_code: z.string().max(50).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
}, safe(async ({ items, address_id: addressId, discount_code: discountCode }) => {
  const [quote, address] = await Promise.all([buildQuote(items, discountCode), resolveAddress(addressId)]);
  return text({
    items: quote.lines.map((l) => `${l.quantity} × ${l.title} (${l.artist}) — ${vnd(l.line_total)}`),
    subtotal: vnd(quote.subtotal),
    discount: quote.discount ? `-${vnd(quote.discount)}` : null,
    discount_note: quote.discountNote,
    shipping: vnd(quote.shipping),
    total: vnd(quote.total),
    payment: 'Thanh toán khi nhận hàng (COD)',
    ship_to: { address_id: address.MaDC, address: describeAddress(address) },
  });
}));

server.registerTool('place_order', {
  title: 'Đặt hàng',
  description: 'Đặt đơn hàng thật, thanh toán khi nhận hàng (COD), giao tới địa chỉ trong sổ địa chỉ. Chỉ gọi sau preview_order và khi người dùng đã đồng ý rõ ràng với sản phẩm, địa chỉ và tổng tiền.',
  inputSchema: {
    items: itemsSchema,
    address_id: z.number().int().positive().optional().describe('Bỏ trống để dùng địa chỉ mặc định'),
    discount_code: z.string().max(50).optional(),
    note: z.string().max(500).optional().describe('Ghi chú cho cửa hàng'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
}, safe(async ({ items, address_id: addressId, discount_code: discountCode, note = '' }) => {
  const [quote, address] = await Promise.all([buildQuote(items, discountCode), resolveAddress(addressId)]);
  const data = await request('/orders', {
    method: 'POST',
    auth: true,
    body: {
      items: quote.lines.map((l) => ({ id: l.id, qty: l.quantity, price: l.unit_price })),
      total: quote.total,
      address: address.DiaChi,
      nguoiNhan: address.NguoiNhan,
      sdtNhan: address.SoDienThoai,
      ghiChu: note ? `[Đặt qua Claude] ${note}` : '[Đặt qua Claude]',
      discountCode: quote.discount ? discountCode : null,
      phuongThucThanhToan: 'cod',
      ghn: {
        provinceId: address.GHNProvinceId || '',
        provinceName: address.GHNTinh || '',
        wardId: address.GHNWardId || '',
        wardName: address.GHNPhuong || '',
      },
    },
  });
  if (!data.success) return failure(`Không đặt được hàng: ${data.message || 'lỗi không xác định'}`);
  return text({
    order_id: data.order_id,
    total: vnd(data.total ?? quote.total),
    payment: 'COD',
    ship_to: describeAddress(address),
    track_url: `${SITE_URL}/#/order/${data.order_id}`,
    message: 'Đặt hàng thành công. Cửa hàng sẽ xác nhận và giao qua GHN.',
  });
}));

server.registerTool('list_my_orders', {
  title: 'Đơn hàng của tôi',
  description: 'Xem các đơn hàng gần đây của tài khoản đang cấu hình: mã đơn, ngày đặt, trạng thái, tổng tiền, thanh toán.',
  inputSchema: { limit: z.number().int().min(1).max(20).optional() },
  annotations: { readOnlyHint: true, openWorldHint: true },
}, safe(async ({ limit = 5 }) => {
  const data = await request('/orders', { auth: true });
  if (!data.success) return failure(data.message || 'Không lấy được danh sách đơn');
  return text((data.data || []).slice(0, limit).map((o) => ({
    order_id: o.MaDH,
    ordered_at: o.NgayDat,
    status: ORDER_STATUS[o.TrangThai] || o.TrangThai,
    total: vnd(o.TongTien),
    payment: `${o.PhuongThucThanhToan || ''}${o.TrangThaiTT === 'dathanhtoan' ? ' (đã thanh toán)' : ''}`,
    url: `${SITE_URL}/#/order/${o.MaDH}`,
  })));
}));

server.registerTool('get_order', {
  title: 'Chi tiết đơn hàng',
  description: 'Xem chi tiết một đơn hàng của tài khoản đang cấu hình: sản phẩm, trạng thái, mã vận đơn GHN.',
  inputSchema: { order_id: z.number().int().positive() },
  annotations: { readOnlyHint: true, openWorldHint: true },
}, safe(async ({ order_id: id }) => {
  const data = await request(`/orders/${id}`, { auth: true });
  if (!data.success) return failure(data.message || `Không xem được đơn #${id}`);
  const { info, items } = data.data;
  return text({
    order_id: info.MaDH,
    status: ORDER_STATUS[info.TrangThai] || info.TrangThai,
    ordered_at: info.NgayDat,
    total: vnd(info.TongTien),
    ghn_code: info.MaDonGHN || null,
    ship_to: [info.NguoiNhan, info.SDTNhan, info.DiaChiGiao].filter(Boolean).join(' · '),
    items: (items || []).map((i) => `${i.SoLuong} × ${i.TenSP || `#${i.MaSP}`} — ${vnd(i.DonGia)}`),
    url: `${SITE_URL}/#/order/${info.MaDH}`,
  });
}));

await server.connect(new StdioServerTransport());
// stdout dành cho giao thức MCP; thông báo chẩn đoán ghi ra stderr.
console.error(`[vocrecord-mcp] sẵn sàng · API ${API_URL}${USERNAME ? ` · tài khoản ${USERNAME}` : ' · chưa cấu hình tài khoản (chỉ tìm kiếm)'}`);
