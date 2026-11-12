# Checkpoint — Chat 2: Giao diện và thao tác người dùng

- **Trạng thái: DONE** · 2026-11-02 15:09 Asia/Saigon, áp dụng [quy ước v2](../QUY_UOC_CHUNG.md) chủ động suốt quá trình.
- **Nhánh:** `parallel/20261102-chat2-ui` (không merge/deploy/publish).
- **Mốc chung:** `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- **Code/tested SHA cuối:** `3b0153fabe988fadfc989206eecf1fb36675ab4e`. **Hai commit sau chỉ sửa tài liệu**: `45214cfbcf3581edc25036cc9f9e37d5b21c9670` (checkpoint WIP), `cf83cadea89d696605fabcce6a7f8acfb7a9bd1c` (báo cáo); commit chứa checkpoint DONE tra từ lịch sử GitHub, không ghi tự tham chiếu.
- **Worktree/WIP:** không có checkout local do container DNS github.com lỗi; tất cả mã+QA+docs đã commit/push bằng GitHub connector, **không có LOCAL_ONLY**. Chưa chứng thực writer khác ngoài GitHub; không thấy commit UI trái phạm vi trong diff.
- **Báo cáo cuối:** [reports/CHAT_2.md](../reports/CHAT_2.md).

## Đã hoàn tất
- Sửa Escape bộ lọc Phòng/CV chỉ xóa khi có giá trị; bổ sung unit colocated.
- Tái hiện bằng Chrome race khóa của `LeaseTextInput` (blur/unmount trước ACK, rapid refocus), sửa epoch + release fence, giữ feedback khi blur để click không bị lệch; giữ nguyên quyền/data/API/thiết kế.
- Bộ QA `source/parallel-qa/chat2/` (mounted component, synthetic Vietnamese, viewport 390/900/1440) và hai workflow chỉ test `.github/workflows/parallel-chat2-*.yml`; không sửa shared smoke runner, không dùng production.

## Bằng chứng exact SHA
| Gate | SHA | Kết luận | Evidence |
|---|---|---|---|
| Unit/typecheck/build ban đầu | `876b69d` | PASS | [41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605) |
| Chrome trước sửa race | `cebc83c` | 10 PASS/4 FAIL; lỗi được tái hiện | [41409826275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275), [PNG/JSON](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275/artifacts/13125610220) |
| Chrome bản cuối + unit/typecheck/build | `3b0153f` | **PASS 14/14 Chrome** và unit/typecheck/build | [41410409226](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409226), [10 PNG/witness](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409226/artifacts/13124872967) |
| Real App guest/admin/two-tabs/ACK/popup/freeze/Excel | `3b0153f` | **PASS 8/8** Auth/RTDB/Functions Emulator `demo-hdnd` | [41410409168](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409168), [20 PNG/witness](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409168/artifacts/13124753409) |

## Quyết định / điểm cần biết
- Mọi ảnh/log dùng dữ liệu **synthetic**: QA component không có Firebase, Full App QA là Emulator localhost; không xác nhận production GO. Giữ nguyên màu, lịch sử N/O, kéo cột adjacent-first, popup guest, polling, quyền và backup.
- Full App run trung gian `fff8d308` [41410259963](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410259963) từng timeout QA02 selector xác nhận quyền (7/8 PASS); **run cuối exact SHA PASS 8/8**. Không sửa expected/runner. Xem báo cáo nếu cần đánh giá tính ổn định CI.
- `QUY_UOC_CHUNG.md` v2 và `HANDOFF_TEMPLATE.md` cập nhật do điều phối; Chat 2 không sửa hai file này.

## Bước tiếp theo / bàn giao
- **Không còn việc Chat 2 bắt buộc.** Người điều phối kiểm tra nhánh, report, artifact và tích hợp theo quy trình chung; không tự merge/deploy.
- Khi chat sau đọc trạng thái DONE, **báo kết quả hiện có, không khởi động vòng sửa mới** trừ khi người dùng giao yêu cầu mới.
