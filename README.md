# digital-academy

Trang học tập Digital Academy cho học sinh, viết bằng Next.js và deploy trên Netlify.

## Trợ lý AI (chatbot)

Bấm vào mascot robot ở góc phải Trang chủ sẽ mở khung chat với Trợ lý AI, chạy bằng Claude (Anthropic).

| Thành phần | Vị trí |
|---|---|
| Khung chat (giao diện) | `src/components/home/AiChat.tsx` |
| Netlify Function `/api/chat` | `netlify/functions/chat/chat.mts` |
| Giới hạn số tin theo IP | `netlify/functions/chat/rate-limit.ts` |
| System prompt cho trợ lý | `netlify/functions/prompts/tutor.txt` |
| Giới hạn dùng chung (số tin, độ dài) | `src/lib/chat.ts` |

Cách hoạt động:

- Trình duyệt gửi `{ messages }` lên `POST /api/chat`. Function chỉ giữ 16 tin gần nhất, cắt mỗi tin còn tối đa 500 ký tự, rồi gọi Claude (`claude-opus-5-5`, `max_tokens` 400) và stream câu trả lời về để chữ hiện dần.
- API key chỉ nằm ở biến môi trường phía server, không bao giờ gửi xuống trình duyệt.
- System prompt được bật prompt caching. Từ lượt thứ hai trong vòng 5 phút, phần prompt này chỉ tính khoảng 1/10 giá. Log của function in ra `cache_read_input_tokens` để kiểm tra.
- Mỗi địa chỉ IP được gửi 30 tin mỗi giờ. Bộ đếm lưu trong Netlify Blobs (store `chat-rate-limit`, chỉ lưu mã băm của IP). Khi vượt giới hạn, học sinh thấy thông báo bằng tiếng Việt và thời gian chờ.
- Nếu Blobs tạm thời lỗi, function vẫn trả lời và ghi log, để học sinh không bị chặn nhầm.
- Sửa nội dung trả lời của trợ lý trong `tutor.txt`, không cần sửa code. Nên giữ prompt dài trên khoảng 512 token, vì prompt ngắn hơn sẽ không được cache.

## Cấu hình trên Netlify

1. Lấy API key tại [platform.claude.com/settings/keys](https://platform.claude.com/settings/keys). Nên đặt hạn mức chi tiêu (spend limit) cho workspace chứa key này.
2. Vào **Site configuration → Environment variables → Add a variable**:
   - Key: `ANTHROPIC_API_KEY`
   - Value: API key vừa tạo
   - Scopes: chọn ít nhất **Functions**
   - Đánh dấu **Contains secret values** để Netlify ẩn giá trị.
3. Deploy lại site (**Deploys → Trigger deploy**) để function nhận biến mới.

Netlify Blobs tự bật cho mọi site nên không cần cấu hình thêm. File `netlify.toml` khai báo `included_files` để `tutor.txt` được đóng gói kèm function.

Nếu chưa cấu hình key, khung chat chỉ báo "Trợ lý AI đang tạm nghỉ", còn log của function ghi rõ nguyên nhân.

## Chạy local

Function chỉ chạy được qua Netlify CLI. `npm run dev` (chỉ chạy Next.js) vẫn mở được trang, nhưng khung chat sẽ báo lỗi vì không có `/api/chat`.

```bash
npm install
npm install -g netlify-cli   # hoặc dùng npx netlify ...

# Cách 1: dùng key riêng ở máy mình
cp .env.example .env.local   # rồi điền ANTHROPIC_API_KEY
netlify dev

# Cách 2: dùng biến môi trường đã khai báo trên Netlify
netlify login
netlify link                 # chọn site Digital Academy
netlify dev
```

Mở địa chỉ `netlify dev` in ra (mặc định http://localhost:8888), không mở cổng 3000 của Next.js.

Khi chạy local, Netlify Blobs dùng một kho giả lập riêng trong `.netlify/blobs-serve`. Xoá thư mục này để reset bộ đếm 30 tin/giờ. Kho giả lập không xử lý chặt các lần ghi đồng thời, nên muốn thử giới hạn thì gửi tin lần lượt từng tin một.

## Lệnh khác

```bash
npm run lint
npm run build
```
