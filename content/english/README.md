# Ngân hàng câu hỏi tiếng Anh (CSV)

Mỗi file `<slug>.csv` là một hành tinh trong game: `lop-5`, `lop-6`, `lop-7`, `lop-8`, `b1`, `b2`, `c1`, `c2`.
Mở bằng Excel / Google Sheets, sửa xong lưu lại dạng **CSV UTF-8**, rồi chạy:

```bash
npm run questions
```

Lệnh này kiểm tra file và sinh lại `src/data/game/questions/generated/*.json` (cũng tự chạy khi `npm run dev` và `npm run build`). Nhớ commit cả file CSV lẫn file JSON đã sinh.

## Các cột

| Cột | Ý nghĩa |
|---|---|
| `topic` | Tên chủ đề. **Mỗi chủ đề là một level**, xếp theo thứ tự xuất hiện trong file. |
| `type` | `mcq` (trắc nghiệm 4 đáp án) hoặc `tf` (đúng/sai) |
| `question` | Đề bài |
| `option_a` … `option_d` | 4 đáp án của câu `mcq`, phải khác nhau. Câu `tf` để trống. |
| `answer` | Câu `mcq`: `A`, `B`, `C` hoặc `D`. Câu `tf`: `true` hoặc `false` (`đúng`/`sai` cũng được). |
| `explanation` | Giải thích hiện ra sau khi học sinh trả lời |

Ví dụ:

```csv
topic,type,question,option_a,option_b,option_c,option_d,answer,explanation
Giới thiệu bản thân,mcq,"« Where are you from? » hỏi về điều gì?",Tuổi,Quê quán,Sở thích,Tên,B,"« Where are you from? » nghĩa là em đến từ đâu."
Giới thiệu bản thân,tf,"« I'm ten years old » nghĩa là tôi mười tuổi.",,,,,true,"Đúng rồi! « ten years old » là mười tuổi."
```

## Luật

- Mỗi chủ đề cần **ít nhất 10 câu**. Mỗi lượt chơi rút ngẫu nhiên 10 câu, nên chủ đề càng nhiều câu thì mỗi lần chơi càng khác.
- **Chủ đề cuối cùng của file là level boss** (đánh boss thời gian thực). Nên để chủ đề ôn tập ("Boss: Tổng ôn…") ở cuối.
- Thêm chủ đề mới: chèn các dòng của chủ đề đó **trước** chủ đề boss.
- Học sinh đang học dở: tiến độ gắn với số thứ tự level và câu hỏi. Chèn chủ đề vào giữa hoặc xoá câu sẽ làm lệch tiến độ của các level phía sau — chỉ nên thêm câu vào cuối mỗi chủ đề.
- Ô có dấu phẩy, dấu ngoặc kép hoặc xuống dòng phải nằm trong dấu `"…"` (Excel / Google Sheets tự làm khi lưu CSV).

## Thêm một hành tinh mới

1. Tạo `content/english/<slug>.csv` theo định dạng trên.
2. Thêm một dòng vào `WORLD_META` trong `src/lib/game/worlds.ts` (tên, màu, `look` = kiểu giao diện, `lang` = `vi` hoặc `en`).
3. Thêm ảnh hành tinh cho Trang chủ trong `PLANET_ART` ở `src/data/courses.ts`.
4. Chạy `npm run questions`.
