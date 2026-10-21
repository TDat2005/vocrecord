import { formatDate, formatDateTime, formatOrderCode, formatPrice } from '../../utils/format';
import { getPaymentStatus } from '../../utils/status';

// Dữ liệu do khách nhập (tên, địa chỉ, ghi chú) phải được escape trước khi ghi vào HTML hóa đơn,
// nếu không có thể chèn mã độc chạy trong phiên đăng nhập của nhân viên.
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function printInvoice({ info, items = [] }) {
  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (!printWindow) return false;

  const subtotal = items.reduce((sum, item) => sum + Number(item.DonGia) * Number(item.SoLuong), 0);
  const rows = items.map((item, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td><strong>${escapeHtml(item.TenSP)}</strong></td>
      <td>${escapeHtml(item.NgheSi || '—')}</td>
      <td class="center">${Number(item.SoLuong)}</td>
      <td class="right">${formatPrice(item.DonGia)}</td>
      <td class="right">${formatPrice(Number(item.DonGia) * Number(item.SoLuong))}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hóa đơn ${formatOrderCode(info.MaDH)} - Vọc Records</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; }
    .invoice { max-width: 760px; margin: auto; }
    .header { display: flex; justify-content: space-between; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 1px solid #ddd; }
    .store { font-size: 20px; font-weight: 700; }
    .muted { color: #616161; font-size: 12px; }
    h1 { margin: 0; font-size: 18px; text-align: right; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .box { border: 1px solid #e3e3e3; border-radius: 8px; padding: 12px; }
    .box h3 { margin: 0 0 6px; font-size: 12px; color: #616161; font-weight: 600; }
    .box p { margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f7f7f7; text-align: left; padding: 8px; font-size: 12px; color: #616161; border-bottom: 1px solid #e3e3e3; }
    td { padding: 8px; border-bottom: 1px solid #ebebeb; }
    .center { text-align: center; } .right { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals td { border: none; padding: 4px 8px; }
    .totals .total td { border-top: 1px solid #1a1a1a; font-size: 15px; font-weight: 700; padding-top: 8px; }
    .signatures { display: flex; justify-content: space-around; margin-top: 40px; text-align: center; }
    .signatures strong { display: block; margin-bottom: 60px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px dashed #ccc; text-align: center; color: #616161; font-size: 12px; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="store">Vọc Records</div>
        <div class="muted">Chuyên đĩa than, cassette & thiết bị âm thanh</div>
        <div class="muted">54 Triều Khúc, Phường Thanh Xuân Nam, Quận Thanh Xuân, Hà Nội</div>
        <div class="muted">Hotline / Zalo: 0766 255 478</div>
      </div>
      <div>
        <h1>HÓA ĐƠN BÁN HÀNG</h1>
        <div class="muted" style="text-align:right">
          Mã đơn: <strong>${formatOrderCode(info.MaDH)}</strong><br>
          Ngày đặt: ${formatDateTime(info.NgayDat)}<br>
          Ngày in: ${formatDateTime(new Date())}
        </div>
      </div>
    </div>
    <div class="grid">
      <div class="box">
        <h3>Người nhận</h3>
        <p><strong>${escapeHtml(info.NguoiNhan || 'Khách vãng lai')}</strong></p>
        <p>${escapeHtml(info.SDTNhan || '—')}</p>
        <p>${escapeHtml(info.DiaChiGiao || '—')}</p>
        ${info.GhiChu ? `<p>Ghi chú: ${escapeHtml(info.GhiChu)}</p>` : ''}
      </div>
      <div class="box">
        <h3>Thanh toán & vận chuyển</h3>
        <p>Hình thức: ${escapeHtml(String(info.ThanhToanHinhThuc || info.PhuongThucThanhToan || 'cod').toUpperCase())}</p>
        <p>Trạng thái: ${escapeHtml(getPaymentStatus(info.TrangThaiTT || 'chuathanhtoan').label)}</p>
        ${info.MaDonGHN ? `<p>Mã vận đơn GHN: ${escapeHtml(info.MaDonGHN)}</p>` : ''}
        ${info.GHNExpectedDelivery ? `<p>Dự kiến giao: ${formatDate(info.GHNExpectedDelivery)}</p>` : ''}
      </div>
    </div>
    <table>
      <thead><tr><th class="center">STT</th><th>Sản phẩm</th><th>Nghệ sĩ</th><th class="center">SL</th><th class="right">Đơn giá</th><th class="right">Thành tiền</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals">
      <tr><td>Tạm tính</td><td class="right">${formatPrice(subtotal)}</td></tr>
      ${Number(info.SoTienGiam) > 0 ? `<tr><td>Giảm giá (${escapeHtml(info.CodeGiamGia || 'Voucher')})</td><td class="right">−${formatPrice(info.SoTienGiam)}</td></tr>` : ''}
      <tr><td>Phí vận chuyển</td><td class="right">${formatPrice(info.PhiVanChuyen)}</td></tr>
      <tr class="total"><td>Tổng thanh toán</td><td class="right">${formatPrice(info.TongTien)}</td></tr>
    </table>
    <div class="signatures">
      <div><strong>Khách hàng</strong>(Ký, ghi rõ họ tên)</div>
      <div><strong>Đại diện Vọc Records</strong>(Ký, đóng dấu)</div>
    </div>
    <div class="footer">Cảm ơn quý khách đã mua sắm tại Vọc Records! Hỗ trợ: 0766 255 478</div>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
