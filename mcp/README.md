# Vọc Records MCP server

Cho Claude Desktop (hoặc bất kỳ ứng dụng hỗ trợ [Model Context Protocol](https://modelcontextprotocol.io)) tìm và mua đĩa ở Vọc Records bằng lời nói tự nhiên:

> "Tìm cho mình một đĩa than nghe lúc trời mưa, dưới 800k, rồi đặt giao về nhà."

Server chạy trên máy người dùng (stdio) và gọi REST API của cửa hàng, nên đơn đặt qua Claude giống hệt đơn đặt trên web: giá, tồn kho, mã giảm giá đều do server cửa hàng kiểm tra lại.

## Công cụ

| Công cụ | Việc làm | Cần đăng nhập |
|---|---|---|
| `search_products` | Tìm kiếm kết hợp từ khóa + ngữ nghĩa, lọc giá/loại | Không |
| `get_product` | Chi tiết sản phẩm (tracklist, tình trạng đĩa...) | Không |
| `list_my_addresses` | Sổ địa chỉ giao hàng | Có |
| `preview_order` | Tính trước đơn: tồn kho, mã giảm giá, phí ship, địa chỉ | Có |
| `place_order` | Đặt đơn COD (Claude được dặn chỉ gọi sau khi bạn đồng ý) | Có |
| `list_my_orders`, `get_order` | Theo dõi đơn hàng | Có |

Claude Desktop luôn hỏi bạn trước khi chạy một công cụ, nên không có đơn nào được đặt nếu bạn chưa bấm cho phép.

## Cài đặt

Cần Node.js 20 trở lên.

```bash
cd mcp
npm install
```

Mở file cấu hình Claude Desktop (Settings → Developer → Edit Config):

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Thêm vào `mcpServers` (sửa đường dẫn và tài khoản):

```json
{
  "mcpServers": {
    "vocrecord": {
      "command": "node",
      "args": ["/duong/dan/toi/vocrecord/mcp/index.js"],
      "env": {
        "VOC_API_URL": "https://ngtiendat.id.vn/api",
        "VOC_USERNAME": "email-tai-khoan-khach@vi-du.com",
        "VOC_PASSWORD": "mat-khau"
      }
    }
  }
}
```

Khởi động lại Claude Desktop. Biểu tượng công cụ ở ô chat sẽ có mục `vocrecord`.

| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `VOC_API_URL` | Gốc REST API của cửa hàng | `http://localhost:8080/api` (Docker Compose) |
| `VOC_SITE_URL` | Gốc website, dùng tạo đường dẫn sản phẩm/đơn hàng | `VOC_API_URL` bỏ `/api` |
| `VOC_USERNAME`, `VOC_PASSWORD` | Tài khoản **khách hàng** dùng để đặt hàng. Bỏ trống thì chỉ tìm kiếm được | — |

Mật khẩu nằm dạng chữ thường trong file cấu hình của Claude Desktop trên máy bạn; nên dùng một tài khoản khách riêng cho việc này. Tài khoản cần có sẵn ít nhất một địa chỉ trong Sổ địa chỉ (thêm trên web, mục Tài khoản).

## Kịch bản demo

1. "Tìm giúp mình nhạc buồn nghe lúc mưa, dưới 800k" → Claude gọi `search_products`.
2. "Cái thứ ba nghe thế nào, có những bài gì?" → `get_product`.
3. "Mua đĩa đó, dùng mã WELCOME10" → `preview_order` trả tổng tiền và địa chỉ; Claude hỏi lại.
4. "Ok đặt đi" → `place_order` trả mã đơn và link theo dõi.
5. "Đơn của mình tới đâu rồi?" → `list_my_orders`.

## Thử nhanh không cần Claude Desktop

```bash
npx @modelcontextprotocol/inspector node index.js
```
