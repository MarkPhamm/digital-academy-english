# digital-academy

Trang học tập Digital Academy cho học sinh, viết bằng Next.js và deploy trên Netlify. Gồm Trang chủ (carousel hành tinh, Trợ lý AI) và trò chơi học tập "Vũ trụ Tri thức".

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

## Trò chơi Vũ trụ Tri thức

Game chỉ dạy **tiếng Anh**. Bấm vào hành tinh ở giữa carousel (hoặc ruy-băng tên khóa) để vào game học tập chuyển từ repo `Edtech-game`: bản đồ thế giới 2.5D, mỗi level 10 câu hỏi rải trên bản đồ, level cuối của mỗi hành tinh là trận đánh boss. Tám hành tinh là tám trình độ: Tiếng Anh lớp 5 → `lop-5`, lớp 6 → `lop-6`, lớp 7 → `lop-7`, lớp 8 → `lop-8`, rồi `b1`, `b2`, `c1`, `c2` (xem `WORLD_META` trong `src/lib/game/worlds.ts`). Lớp 5–8 ra đề bằng tiếng Việt; B1–C2 ra đề hoàn toàn bằng tiếng Anh.

**Thêm câu hỏi / chủ đề**: sửa file CSV trong `content/english/` (mỗi hành tinh một file, mỗi chủ đề là một level) rồi chạy `npm run questions`. Định dạng và cách thêm hành tinh: xem `content/english/README.md`.

| Thành phần | Vị trí |
|---|---|
| Các trang game `/world/:slug`, `/play/:levelId`, `/result/:id`, `/review/:slug`, `/skins` | `src/app/(game)/` (CSS riêng `game.css`, bọc dưới `.vt`) |
| Engine canvas, bản đồ, boss, thẻ câu hỏi (port nguyên văn) | `src/components/game/` |
| Netlify Function `/api/game/*` (router dùng chung với route handler của Next) | `netlify/functions/game/game.mts`, `router.ts` |
| Luật chơi, xu, giá trang phục | `src/lib/game/rules.ts`, `src/lib/game/skins.ts` |
| Câu hỏi gốc dạng CSV (sửa ở đây) | `content/english/*.csv` → `scripts/build-questions.mjs` |
| Ngân hàng câu hỏi đã sinh (chỉ function import — có đáp án) | `src/data/game/questions/` (`generated/*.json`) |
| Kiểu dữ liệu API, client fetch, kho hồ sơ phía trình duyệt | `src/lib/game/api-types.ts`, `client.ts`, `profile-store.ts` |

Cách hoạt động:

- Chưa có đăng nhập: function cấp cookie `da_device` (UUID, httpOnly, 1 năm) ở lần gọi đầu tiên; hồ sơ lưu trong Netlify Blobs (store `game-profiles`, key là mã băm của UUID). Muốn thay bằng đăng nhập thật chỉ cần sửa `identity.ts`.
- Đáp án đúng chỉ nằm ở server. Trình duyệt nhận 10 câu (không có đáp án), gửi từng câu lên để chấm; câu trả lời đầu tiên là cuối cùng.
- **Xu**: mỗi câu trả lời đúng được 10 xu, nhưng chỉ thưởng **lần đầu** câu đó được trả lời đúng (chơi lại hay ôn tập đều theo luật này). Trả lời sai không mất xu.
- **Trang phục**: Spartan miễn phí; 9 bộ còn lại giá 100 → 300 xu, khoá cho tới khi mua. Mua xong mặc luôn. Shop ở `/skins`, mở từ nút "Trang phục" trong game hoặc bấm avatar ở Trang chủ.
- Sao, mở level, ôn câu sai giữ đúng luật repo gốc: đúng ≥ 7/10 là qua level, 7–8 = ★, 9 = ★★, 10 = ★★★; level sau mở khi level trước qua.
- Mọi thao tác ghi dùng compare-and-swap theo etag của Blobs nên bấm hai lần / mở hai tab không cộng xu hay trừ xu hai lần.

Chạy local: game chạy được cả với `npm run dev` trần (route handler `src/app/api/game/[...path]/route.ts` dùng chung bộ định tuyến `netlify/functions/game/router.ts`; không có Blobs thì hồ sơ lưu tạm ở `.netlify/blobs-dev/`) lẫn `netlify dev` (Blobs giả lập ở `.netlify/blobs-serve`). Reset hồ sơ test: xoá thư mục tương ứng hoặc xoá cookie `da_device` trong trình duyệt.

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
