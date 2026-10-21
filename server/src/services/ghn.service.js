const axios = require('axios');

const GHN_BASE_URL = process.env.GHN_ENV === 'production'
    ? 'https://online-gateway.ghn.vn/shiip/public-api'
    : 'https://dev-online-gateway.ghn.vn/shiip/public-api';

const numberEnv = (name, fallback) => {
    const value = Number.parseInt(process.env[name], 10);
    return Number.isFinite(value) ? value : fallback;
};

// Danh sách 34 tỉnh/thành sau sắp xếp hành chính 2025 (lấy từ GHN), dùng khi không gọi được API GHN.
const FALLBACK_PROVINCES = [
    { _id: '1000013', name: 'An Giang' },
    { _id: '1000021', name: 'Bắc Ninh' },
    { _id: '1000022', name: 'Cà Mau' },
    { _id: '1000032', name: 'Cao Bằng' },
    { _id: '1000005', name: 'Cần Thơ' },
    { _id: '1000003', name: 'Đà Nẵng' },
    { _id: '1000010', name: 'Đắk Lắk' },
    { _id: '1000026', name: 'Điện Biên' },
    { _id: '1000006', name: 'Đồng Nai' },
    { _id: '1000012', name: 'Đồng Tháp' },
    { _id: '1000007', name: 'Gia Lai' },
    { _id: '1000000', name: 'Hà Nội' },
    { _id: '1000029', name: 'Hà Tĩnh' },
    { _id: '1000004', name: 'Hải Phòng' },
    { _id: '1000001', name: 'Hồ Chí Minh' },
    { _id: '1000002', name: 'Huế' },
    { _id: '1000023', name: 'Hưng Yên' },
    { _id: '1000008', name: 'Khánh Hòa' },
    { _id: '1000025', name: 'Lai Châu' },
    { _id: '1000033', name: 'Lạng Sơn' },
    { _id: '1000024', name: 'Lào Cai' },
    { _id: '1000009', name: 'Lâm Đồng' },
    { _id: '1000031', name: 'Nghệ An' },
    { _id: '1000016', name: 'Ninh Bình' },
    { _id: '1000015', name: 'Phú Thọ' },
    { _id: '1000019', name: 'Quảng Ngãi' },
    { _id: '1000028', name: 'Quảng Ninh' },
    { _id: '1000017', name: 'Quảng Trị' },
    { _id: '1000027', name: 'Sơn La' },
    { _id: '1000018', name: 'Tây Ninh' },
    { _id: '1000020', name: 'Thái Nguyên' },
    { _id: '1000030', name: 'Thanh Hóa' },
    { _id: '1000014', name: 'Tuyên Quang' },
    { _id: '1000011', name: 'Vĩnh Long' }
];

class GHNService {
    static isConfigured() {
        return Boolean(process.env.GHN_TOKEN && process.env.GHN_SHOP_ID);
    }

    static requireConfigured() {
        if (!this.isConfigured()) {
            const error = new Error('GHN chưa được cấu hình. Hãy thêm GHN_TOKEN và GHN_SHOP_ID vào server/.env');
            error.status = 503;
            throw error;
        }
    }

    static async request(method, path, { data, params, withShop = true } = {}) {
        this.requireConfigured();
        const headers = { 'Content-Type': 'application/json', Token: process.env.GHN_TOKEN };
        // API danh mục (tỉnh/phường) không cần ShopId; gửi ShopId sai thì GHN báo "Lỗi lấy thông tin shop".
        if (withShop) headers.ShopId = String(process.env.GHN_SHOP_ID);
        try {
            const response = await axios({
                method,
                url: `${GHN_BASE_URL}${path}`,
                data,
                params,
                timeout: numberEnv('GHN_TIMEOUT_MS', 15000),
                headers
            });
            const body = response.data || {};
            if (body.code !== 200) {
                const error = new Error(body.message || 'GHN trả về lỗi không xác định');
                error.status = 502;
                error.ghn = body;
                throw error;
            }
            return body.data;
        } catch (err) {
            // Lấy thông báo lỗi thật của GHN (vd: "ward not found", "From address conflict") thay vì "status code 400".
            if (err.response?.data?.message) {
                const error = new Error(`GHN: ${err.response.data.message}`);
                error.status = 502;
                error.ghn = err.response.data;
                throw error;
            }
            throw err;
        }
    }

    static async calculateFee(payload) {
        if (this.isConfigured()) {
            try {
                return await this.request('POST', '/v2/shipping-order/fee', { data: payload });
            } catch (err) {
                console.warn('GHN calculateFee API failed, using staging fallback:', err.message);
            }
        }
        return {
            total: 30000,
            service_fee: 30000,
            insurance_fee: 0,
            pick_station_fee: 0,
            coupon_value: 0,
            r2s_fee: 0
        };
    }

    static async createOrder(payload) {
        if (this.isConfigured() && process.env.GHN_ENV === 'production') {
            return this.request('POST', '/v2/shipping-order/create', { data: payload });
        }

        // Môi trường thử (staging): gọi GHN dev, lỗi thì tạo mã giả lập để vẫn demo được luồng giao hàng.
        // Lý do lỗi được trả kèm (ghn_error) để trang quản trị hiển thị, không bị che mất như trước.
        let ghnError = this.isConfigured() ? null : 'GHN chưa được cấu hình';
        try {
            if (this.isConfigured()) {
                return await this.request('POST', '/v2/shipping-order/create', { data: payload });
            }
        } catch (err) {
            ghnError = err.message;
            console.warn('GHN dev createOrder API returned error, creating staging simulation:', err.message);
        }

        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const mockCode = `VOC-STG-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 3);

        return {
            order_code: mockCode,
            total_fee: 30000,
            expected_delivery_time: deliveryDate.toISOString(),
            status: 'ready_to_pick',
            is_staging: true,
            ghn_error: ghnError
        };
    }

    static async getOrderInfo(orderCode) {
        if (String(orderCode).startsWith('VOC-STG')) {
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + 2);
            return {
                order_code: orderCode,
                status: 'ready_to_pick',
                status_name: 'Đang chuẩn bị hàng / Chờ lấy hàng',
                total_fee: 30000,
                expected_delivery_time: deliveryDate.toISOString(),
                is_staging: true
            };
        }
        try {
            return await this.request('GET', '/v2/shipping-order/detail', { params: { order_code: orderCode } });
        } catch (err) {
            console.warn(`GHN getOrderInfo(${orderCode}) API failed:`, err.message);
            return {
                order_code: orderCode,
                status: 'ready_to_pick',
                status_name: 'Đang chuẩn bị hàng (Staging)',
                total_fee: 30000,
                is_staging: true
            };
        }
    }

    static async cancelOrder(orderCodes, reasonCode = 'GHN-CANCEL-OTHER', reason = '') {
        const codes = Array.isArray(orderCodes) ? orderCodes : [orderCodes];
        const isStaging = codes.some(c => String(c).startsWith('VOC-STG'));
        if (isStaging) {
            return codes.map(code => ({
                order_code: code,
                result: true,
                message: 'Đã hủy đơn thành công (Staging)'
            }));
        }
        try {
            return await this.request('POST', '/v2/switch-status/cancel', {
                data: { order_codes: codes, reason_code: reasonCode, reason }
            });
        } catch (err) {
            console.warn('GHN cancelOrder API failed:', err.message);
            return codes.map(code => ({ order_code: code, result: true }));
        }
    }

    static async returnOrder(orderCodes) {
        return this.request('POST', '/v2/switch-status/return', { data: { order_codes: orderCodes } });
    }

    static async getProvinces() {
        if (this.isConfigured()) {
            try {
                const data = await this.request('GET', '/v3/master-data/province/all', { params: { offset: 0, limit: 200 }, withShop: false });
                if (Array.isArray(data) && data.length > 0) {
                    return data.map(({ _id, name }) => ({ _id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
                }
            } catch (err) {
                console.warn('GHN getProvinces API failed, using staging fallback:', err.message);
            }
        }
        return FALLBACK_PROVINCES;
    }

    static async getWards(provinceId) {
        if (this.isConfigured()) {
            try {
                // GHN trả tối đa 200 phường mỗi lần (Hà Nội có hơn 120): lấy hết các trang.
                let wards = [];
                for (let offset = 0; offset < 2000; offset += 200) {
                    const page = await this.request('GET', '/v3/master-data/ward/all-by-province-id', {
                        params: { province_id: provinceId, offset, limit: 200 },
                        withShop: false
                    });
                    if (!Array.isArray(page)) break;
                    wards = wards.concat(page);
                    if (page.length < 200) break;
                }
                if (wards.length > 0) {
                    return wards
                        .map(({ _id, name }) => ({ _id, name }))
                        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
                }
            } catch (err) {
                console.warn(`GHN getWards(${provinceId}) API failed, using staging fallback:`, err.message);
            }
        }
        // Không có danh sách phường: trả rỗng để giao diện cho khách tự nhập tên phường/xã.
        return [];
    }

    static getDefaultDimensions() {
        return {
            weight: numberEnv('GHN_DEFAULT_WEIGHT_GRAM', 600),
            length: numberEnv('GHN_DEFAULT_LENGTH_CM', 25),
            width: numberEnv('GHN_DEFAULT_WIDTH_CM', 20),
            height: numberEnv('GHN_DEFAULT_HEIGHT_CM', 8)
        };
    }

    static buildOrderPayload(order, items, shipping = {}) {
        const itemDimensions = this.getDefaultDimensions();
        // Khối lượng tính theo tổng số món (mặc định ~600g/món đã đóng gói), không cố định 600g cho cả đơn.
        const totalQuantity = items.reduce((sum, item) => sum + Number(item.SoLuong || 1), 0) || 1;
        const dimensions = {
            weight: Number(order.CanNang || shipping.weight || itemDimensions.weight * totalQuantity),
            length: Number(order.ChieuDai || shipping.length || itemDimensions.length),
            width: Number(order.ChieuRong || shipping.width || itemDimensions.width),
            height: Number(order.ChieuCao || shipping.height || itemDimensions.height * Math.min(totalQuantity, 5))
        };
        // service_type_id 2 = hàng nhẹ (thương mại điện tử), 5 = hàng nặng (từ 20kg).
        // Trước đây đơn có từ 2 sản phẩm bị chọn nhầm gói hàng nặng.
        const serviceTypeId = dimensions.weight >= 20000 ? 5 : 2;
        return {
            payment_type_id: Number(process.env.GHN_PAYMENT_TYPE_ID || 2),
            required_note: process.env.GHN_REQUIRED_NOTE || 'CHOXEMHANGKHONGTHU',
            client_order_code: `VOC-${order.MaDH}`,
            to_name: order.NguoiNhan,
            to_phone: order.SDTNhan,
            to_address: order.DiaChiGiao,
            to_ward_name: order.GHNWardName || shipping.wardName,
            to_province_name: order.GHNProvinceName || shipping.provinceName,
            is_new_to_address: order.GHNIsNewAddress !== false,
            from_name: process.env.GHN_FROM_NAME,
            from_phone: process.env.GHN_FROM_PHONE,
            from_address: process.env.GHN_FROM_ADDRESS,
            from_ward_name: process.env.GHN_FROM_WARD_NAME,
            from_province_name: process.env.GHN_FROM_PROVINCE_NAME,
            is_new_from_address: process.env.GHN_FROM_IS_NEW_ADDRESS !== 'false',
            return_name: process.env.GHN_RETURN_NAME || process.env.GHN_FROM_NAME,
            return_phone: process.env.GHN_RETURN_PHONE || process.env.GHN_FROM_PHONE,
            return_address: process.env.GHN_RETURN_ADDRESS || process.env.GHN_FROM_ADDRESS,
            return_ward_name: process.env.GHN_RETURN_WARD_NAME || process.env.GHN_FROM_WARD_NAME,
            return_province_name: process.env.GHN_RETURN_PROVINCE_NAME || process.env.GHN_FROM_PROVINCE_NAME,
            is_new_return_address: process.env.GHN_RETURN_IS_NEW_ADDRESS !== 'false',
            weight: dimensions.weight,
            length: dimensions.length,
            width: dimensions.width,
            height: dimensions.height,
            service_type_id: serviceTypeId,
            cod_amount: order.PhuongThucThanhToan === 'cod' ? Math.round(Number(order.TongTien)) : 0,
            insurance_value: Math.min(Math.round(Number(order.TongTien)), 5000000),
            order_value: Math.round(Number(order.TongTien)),
            content: items.map((item) => `${item.TenSP} x${item.SoLuong}`).join(', ').slice(0, 2000),
            note: order.GhiChu || '',
            items: items.map((item) => ({
                name: item.TenSP,
                code: `SP-${item.MaSP}`,
                quantity: Number(item.SoLuong),
                price: Math.round(Number(item.DonGia)),
                length: itemDimensions.length,
                width: itemDimensions.width,
                height: itemDimensions.height,
                weight: itemDimensions.weight
            }))
        };
    }
}

module.exports = GHNService;
