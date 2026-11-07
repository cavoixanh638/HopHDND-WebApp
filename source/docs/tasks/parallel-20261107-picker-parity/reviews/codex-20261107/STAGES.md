# Giao tiếp STAGES — bổ sung evidence còn thiếu, giữ core PASS

Tiếp tục chat STAGES hiện có trên **ui/20261107-picker-parity-stages**. Đọc HEAD + checkpoint hiện tại và [review](README.md), không reset/đợi CONTENT hoặc mở chat khác.
Spec gốc: ../../README.md. COMMANDER đã có addendum cùng3gaps; đây là prompt tiếp quản thực thi cụ thể, không giao thêm tính năng.

## Mốc đã xác minh
8c0d9fbc7284493dcb31018aa117595362b61119 đã **PASS** [CI42267219205](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205),15unit,32browsercases,6widthscenarios,artifact13527872811.
Checkpoint25fbef3 ghi latestCIpending là lỗi thời: outsideclick/scroll/resize đãPASS. Cập nhật đúng, không sửa lại reduced-motion hoặc CSS đãPASS nếu không phát hiện lỗi mới.

## Hoàn tất các gate đang thiếu
1. **Không trong browser mounted thật**: case cấp trìnhKhông và tài khoản có grant progressParty độc lập, trên ItemList và popup. Assert progressParty là text bất hoạt, không button/caret/không mở editor dù grant, vẫn giữ status/labels/nền hiện hành và Build/Council theo đúng quyền. Fixture phải thuộc prefixpicker-parity-stages nếu cần thêm, không sửa fixture worker khác/core logic. Không tự đổi dữ liệu/mapping.
2. **Cấp trình và keyboard**: kiểm dropdown partyLevel thực, ArrowUp/Down + Enter/Space chọn giá trị,Escape/clickngoài; nếu chọnKhông qua fixture có thể cập nhật thì assert projection bất hoạt như1. Không coi test pointerchọn progress đầu tiên là coverage bàn phím của cả4ô. Không đụng transaction backend; ghi rõ giới hạn fixtureRAM.
3. **Custom palette và highlight**: editable coloredstatus và readonly riêng có tint; normal/hover/keyboardfocus/open giữ computedbackground/foreground đúng. Kiểm cả2/3tracks,List/popup và viewporthẹp phù hợp; readonly vẫn tint nhưng khôngfakecontrol; L04 không đổi. Không chuyển thành kiểmCSS string đơn thuần.
4. **Matching before/after**: detachedbaseline e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa, cùngfixture/viewport, chụpPNG+rects/computedstyle trước/sau cho2/3tracks,List/popup,1440/900/390. Không sửa ứng dụng baseline để nó giống after; có thể overlay fixtureharness mới trênbaseline nhưng sourcecomponents/CSSbaseline phải giữ nguyên và ghi rõ.
5. Chạy đúng newsourceSHA trong workflow riêng, artifacts gồm từngcase mới+bằng chứngbefore vàsummary cụ thể. Giữ nguyên phầnPASS cũ, không viết lại toàn bộUI hoặc phụ thuộc CONTENT.
6. Cập nhật handoffs/STAGES.md với fulltestedSHA/run/artifact/criteriaPASS và tình trạng thật. ChỉDONE khi gatesđủ; thiếu thì ghi NOTRUN/blocker cótái hiện và bước tiếp tục.

Không sửa sourcebênngoàiscope gốc, không viết tracker/nhánhcommander, khôngmerge/deploy. Commander phụ trách integrationSHA/package/demo; không lấy RAMfixture làm bằng chứng Firebasepersistence.
