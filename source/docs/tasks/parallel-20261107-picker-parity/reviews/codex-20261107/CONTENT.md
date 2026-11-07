# Giao tiếp CONTENT — chỉ sửa clipping hover/focus

Bạn tiếp tục chat CONTENT đang có trên **ui/20261107-picker-parity-content**. Đọc HEAD + handoffs/CONTENT.md hiện tại và [review](README.md). Không reset, không đợi STAGES, không mở chat mới.
Spec gốc: ../../README.md. Phạm vi gốc và giới hạn vẫn áp dụng; nhiệm vụ tiếp tục cụ thể dưới đây được thêm vào acceptance.

## Giữ kết quả đã PASS
Exact tested SHA9fb74b7fda1ab4492011dc675df5d656e74f6000, [CI42269772715](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269772715): typecheck,40unit,build,73browsercases và baseline before PASS.
Không làm lại UI từ đầu, không giao lại long Sở/empty/type matrix đã xong. Không thay referenceL04, backend, width model hoặc scope khác.

## F01: lỗi đã xác nhận từ artifact
picker-parity-content.css đặt .compact-document-heading overflow-x:auto/overflow-y:hidden,padding0; heading cao26px. Hover target translateY(-3px),outline2px và shadow ra ngoài bị vùng chứa clip.
Artifact13527674364 đúng testedSHA: 1440-list-edit-hover.png và .json; heading y728.1875,h26 trong khi QPPLbutton y725.1875,h26. Ảnh thật mất viền trên/bóng. Chỉ assert computed transform/shadow như hiện tại không phát hiện paint clipping.

## Thực hiện end-to-end
1. Tái hiện bằng screenshot có sẵn và browser của nhánh mình, List+popup, Sở/LoạiVB, editable/mixed ở1440/900/390.
2. Sửa **picker-parity-content.css** trong scope L01 để có vùng paint đủ cho lift/outline/shadow nhưng không tăng chiều cao layout hàng, không đẩy nội dung/ô hàng kế tiếp hoặc gây scroll trang. Có thể dùng wrapper/compensated paint room phù hợp; tránh đặt overflow-y:visible cùng overflow-x:auto rồi giả định đã hết clip (computed overflow có thể vẫn auto).
3. Giữ đúng lift3px,outline/shadow180ms,26pxminheight,font11,padding4x7,radius6,caret5x3; giữ màu background và nghiệp vụ, readonly nền riêng, mixedmetadata cùng dòng/nguyên tắcngoặc. Không chữa bằng giảm lift/bỏ bóng/đổi màu.
4. Thêm regression nhỏ kiểm clip ancestors/paint room, trước-sau với ảnh thật. Cần ít nhất toàn bộ borderbox+outline sau transform nằm trong clip rectangle; vùng shadow không bị cắt ở heading. Kiểm thêm viewportscroll/clip ở mép và hover state không làm đổi hàng/độ rộng.
5. Keyboard focus-visible phải kiểm bằng bàn phím thật với pointer rời nút, không chỉ .focus() lúc pointer vẫn hover. Giữ reduced-motion/print đãPASS.
6. Chạy lại checks bị ảnh hưởng trên sourceSHA mới, giữ nguyên tests/evidence cũ, không giảm assertion để xanh. Own CI/featurebrowser cần đủ và đúng SHA trước khi DONE.
7. Commit/push và checkpoint thường xuyên. Bàn giao source/testedSHA,run/artifact,screenshot/rects trước-sau củaF01,cách đảm bảo không clip/layoutshift, và phần regression vẫnPASS.

Không sửa nhánh COMMANDER/STAGES hoặc file sở hữu chung; không tự merge/deploy. Nếu phát hiện source HEAD đã sửa F01 thì chỉ xác minh evidence tương đương, không lặp sửa.
