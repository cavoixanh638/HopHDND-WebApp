# PICKER checkpoint — UI controls 06/11/2026

Status: IN_PROGRESS_SURVEY (không phải DONE)
Branch/owner: ui/20261106-picker-restore — PICKER duy nhất
Initial remote HEAD: `0eede66c4f8c05d416084aeab08fd5a030f5bc80` (commit docs, parent `aa8c21a919eee52a50b74d759f810dc5b61066a7`)
Baseline: `8a201c1bf48c7916e4d0af9e1c0ca60cd6737632` (branch ahead 9, behind 0; diff baseline chỉ 9 file giao việc/checkpoint)
Reference UI: `ab8629c7575debd494c908c14bde9967a575a82a`, trước unified `2a7fe5da3fc19e7b2233e550c2c474f55183a670`
Code/tested SHA: NONE FOR NEW TASK; chưa nghiệm thu
Working tree: GitHub branch is a committed ref (no remote dirty tree); local clone chưa có, `git ls-remote` trong container lỗi DNS github.com. Không giả định có local clean working tree.
Owned scope: `source/src/components/CellPicker.tsx` (đường dẫn thực kiểm sau), stylesheet picker; chỉ skin nhân sự/caret/hover/focus trong `item-frame.css`; `app.css` chỉ rule picker; test/browser riêng `ui-20261106-picker*`. Cấm sửa `CompactGroupedValue.tsx`, `ItemList.tsx`, TRACKS, width/grid.
Task: so cùng fixture + viewport của reference/current; khôi phục có chọn lọc 4 field nhân sự list/popup, duy nhất tam giác đặc nhỏ cho editable picker; không đổi data/contract, L01/L03, trạng thái màu.
Verification pending: TypeScript, unit, browser 1440/900/390 cùng fixtures, state normal/hover/focus/open, pointer/keyboard/read-only/lease, screenshot/diff/rects; backend nếu cần Emulator. Không chấm PASS từ CSS text.
Blocker/route: kết nối GitHub qua connector đọc/ghi được; runtime container hiện không DNS tới github.com, đang khảo sát cách tái lập Chromium và dùng CI sau commit.
Next (tối đa 3):
1. Truy file picker/styles/test và so selector, diff trước/sau unified; dựng checklist skin + fixture.
2. Chỉnh đúng file sở hữu; thêm browser test script độc lập và checkpoint WIP.
3. Chạy browser/typecheck/unit/CI trên exact SHA, thu artefact, sửa tới PASS, chốt DONE khi đủ.
