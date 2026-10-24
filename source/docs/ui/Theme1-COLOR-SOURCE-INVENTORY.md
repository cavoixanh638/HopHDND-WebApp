# Theme1 — exhaustive source color declarations (read-only snapshot)

Baseline Git tree `1029ee15336a15a42a9f1b1b2ca8fefd387ba63a`, snapshot commit `c52f162e42b5ad6893c043d8b84b7914fe247b16`.
This inventory reproduces every **source line** matching color, background, border, shadow, outline, RGB/HEX or theme variable in the audited files. Use the frozen snapshot branch for the **entire original source and CSS order** (including selectors, specificity, media queries). A color listed in an earlier rule may be overridden by a later rule. **No production styles were modified for this archive.**

## `source/src/styles/app.css`

Git blob SHA `60cb1a18ed018de4b4885e0cd5841d4fb1751c8e`; 532 relevant source lines / 2239 total.

```text
0002 |   :root {  font-family:"Segoe UI",system-ui,-apple-system,sans-serif; color:#20332e; background:#f5f6f2; font-synthesis:none; text-rendering:optimizeLegibility; --green:#154d44;
0003 |   --ink:#20332e; --muted:#687a73; --line:#dce3de; --surface:#fff; --soft:#e5efeb; --danger:#a53c35;
0004 |     --shadow:0 10px 32px #15302717}
0007 |     background:#f5f6f2}
0013 |   input,select,textarea {  width:100%; min-height:36px; padding:8px 10px; color:var(--ink); background:var(--surface); border:1px solid #cbd6cf;
0014 |   border-radius:7px;
0015 |    outline:none}
0017 |    accent-color:var(--green)}
0020 |   input:focus,select:focus,textarea:focus {  border-color:#54877a;
0021 |    box-shadow:0 0 0 3px #154d441f}
0022 | input::placeholder,textarea::placeholder {  color:#8a9891}
0026 |    border-bottom:1px solid var(--line)}
0029 |   .brand {  gap:12px; color:var(--green);
0031 |   .brand-mark {  display:grid; width:40px; height:40px; flex:none; place-items:center; color:#fff;
0032 |   background:var(--green); border-radius:12px;
0037 |   .brand-text span {  color:var(--muted); font-size:12px;
0039 |   .version {  color:var(--muted);
0043 |   .demo-banner {  display:flex; align-items:center; gap:8px; margin-top:18px; padding:10px 14px; color:#665020;
0044 |   background:#fff8e6; border:1px solid #eee1b9; border-radius:9px;
0047 |    border-bottom:1px solid var(--line)}
0048 |   .nav-tabs button {  position:relative; flex:none; min-height:42px; padding:0 15px; color:var(--muted); background:transparent;
0049 |   border:0; font-size:14px; font-weight:600;
0051 | .nav-tabs button.active {  color:var(--green)}
0052 |   .nav-tabs button.active::after {  position:absolute; right:12px; bottom:-1px; left:12px; height:3px; background:var(--green);
0053 |   border-radius:3px 3px 0 0;
0057 |   .page-heading h1 {  margin:3px 0 0; color:#18382f; font-size:clamp(22px,3vw,30px);
0059 |   .eyebrow {  margin:0; color:#638176; font-size:11px; font-weight:750;
0061 |   .muted {  color:var(--muted);
0063 |   .notice,.unknown-note {  padding:10px 13px; border:1px solid #d7e5db; border-radius:8px; font-size:12px;
0065 |   .notice {  color:#38584c;
0066 |    background:#edf4ef}
0067 |   .unknown-note {  color:#765d28; background:#fff8e7;
0068 |    border-color:#eee2bd}
0071 |   .kpi-card,.card {  min-width:0; background:var(--surface); border:1px solid var(--line); border-radius:12px;
0072 |    box-shadow:0 2px 8px #1e372d08}
0075 |   .kpi-card>span:first-child {  color:#53675e; font-size:13px;
0077 |   .kpi-value {  color:var(--green); font-size:clamp(25px,3vw,34px); font-variant-numeric:tabular-nums;
0079 |   .kpi-note {  color:var(--muted); font-size:12px;
0085 |   .card-header h3 {  margin:0; color:#24483e;
0090 |   .field {  display:grid; min-width:150px; gap:6px; color:#42564e; font-size:12px;
0097 |   color:#344a41; background:#fff; border:1px solid #cbd6cf; border-radius:7px; font-size:13px; font-weight:650;
0099 |   .button:hover {  background:#f3f7f4;
0100 |    border-color:#9eb5a9}
0103 |   .button.primary {  color:#fff; background:var(--green);
0104 |    border-color:var(--green)}
0105 | .button.primary:hover {  background:#103d36}
0106 |   .button.ghost {  color:var(--green); background:transparent;
0107 |    border-color:transparent}
0108 | .button.ghost:hover {  background:var(--soft)}
0109 |   .button.danger {  color:var(--danger);
0110 |    border-color:#e7c7c4}
0111 |   .status-pill {  display:inline-flex; min-height:24px; align-items:center; padding:3px 8px; border-radius:999px; font-size:11px;
0114 |   .status-pill.success {  color:#216047;
0115 |    background:#e7f3eb}
0116 |   .status-pill.warning {  color:#795718;
0117 |    background:#fff5dc}
0118 |   .report-config {  margin-bottom:10px; padding:10px 12px; background:#fff; border:1px solid var(--line);
0119 |    border-radius:8px}
0120 |   .report-config summary {  color:#38584c; font-size:13px; font-weight:650;
0122 |   .column-choices {  display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px 14px; margin:12px 0; color:#42564e;
0127 |   .table-wrap {  width:100%; overflow:auto; border:1px solid var(--line); border-radius:9px; background:#fff; scrollbar-width:thin;
0129 |   .data-table {  width:100%; min-width:950px; border-collapse:separate; border-spacing:0; color:#293b34; font-size:13px;
0142 |   .data-table th,.report-table th {  position:sticky; z-index:1; top:0; padding:10px 11px; color:#456057; background:#f1f5f2;
0143 |   border-bottom:1px solid #d6e0d9; font-size:12px; font-weight:700;
0145 |   .data-table td,.report-table td {  padding:9px 11px; border-bottom:1px solid #edf0ed;
0147 | .data-table:not(.report-table) tr:hover {background:#f8faf8}
0153 |   .code {  color:#385b50; font-family:Consolas,monospace; font-size:12px; font-weight:650;
0155 |   .data-table td small {  display:block; margin-top:4px; color:var(--muted);
0157 |   .content-button {  max-width:420px; padding:0; color:#293b34; background:none; border:0; font:inherit;
0160 |   .content-button:hover {  color:var(--green);
0162 |   .count-button {  display:inline-grid; width:36px; height:32px; min-height:32px; place-items:center; color:var(--green);
0163 |   background:var(--soft); border:1px solid #d5e5dd; border-radius:7px; font-size:12px;
0165 |   .empty {  padding:32px 18px; color:var(--muted);
0167 |   .warning-text {  color:#795718;
0169 |   .error-text {  color:#a2342f; font-size:12px;
0172 |   padding:11px 14px; background:#fff; border:1px solid #d5dfd8; border-radius:10px; box-shadow:var(--shadow);
0181 |    color:#24483e}
0184 |   .detail-item,.history-entry {  padding:11px 0; border-bottom:1px solid #e7ece8; font-size:13px;
0186 | .detail-item:last-child,.history-entry:last-child {  border-bottom:0}
0188 | .detail-item small {  color:var(--muted)}
0189 |   .app-footer {  display:flex; justify-content:space-between; gap:12px; padding:18px 0 6px; color:var(--muted); border-top:1px solid var(--line);
0191 |   .modal {  width:min(760px,calc(100vw - 32px)); max-width:calc(100vw - 32px); max-height:min(88vh,900px); padding:0; overflow:auto; color:var(--ink);
0192 |   background:#fff; border:1px solid #d6dfd9; border-radius:14px;
0193 |     box-shadow:0 24px 80px #0e211c47}
0194 |   .modal::backdrop {  background:#0f1f1a7a;
0198 |   .modal-header {  position:sticky; z-index:1; top:0; justify-content:space-between; padding:16px 20px; background:#fff;
0199 |     border-bottom:1px solid var(--line)}
0200 |   .modal-header h2 {  margin:0; color:#24483e;
0205 |   background:#fff;
0206 |    border-top:1px solid var(--line)}
0208 | .metric-line strong {  color:var(--green)}
0247 |    background:#fff}
0249 |   body.is-printing #print-target {  display:block!important; color:#111;
0250 |    background:#fff}
0252 |    border:0}
0253 |   body.is-printing #print-target .report-table {  width:100%; min-width:0; color:#111;
0255 |   body.is-printing #print-target .report-table th {  position:static; color:#111; background:#e8eee9!important;
0258 |    border:1px solid #9da7a0}
0263 | .options-menu > summary { display:grid; place-items:center; width:34px; height:34px; border:1px solid var(--line); border-radius:8px; color:var(--muted); cursor:pointer; list-style:none; font-size:18px; }
0265 | .options-menu > summary:focus-visible { outline:2px solid var(--green); outline-offset:2px; }
0266 | .options-popover { position:absolute; right:0; top:40px; width:min(290px,calc(100vw - 30px)); padding:6px; z-index:10; background:#fff; border:1px solid var(--line); border-radius:10px; box-shadow:var(--shadow); }
0267 | .options-popover button { display:block; width:100%; padding:11px; border:0; background:transparent; border-radius:6px; text-align:left; color:var(--ink); font-size:13px; }
0268 | .options-popover button:hover { background:var(--soft); }
0269 | .settings-mode-bar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px; margin-bottom:18px; background:var(--soft); border:1px solid #b7cfc3; border-radius:10px; }
0270 | .settings-mode-bar p { margin:5px 0 0; font-size:13px; color:var(--muted); }
0272 | .settings-saving { margin:0; padding:0; border:0; min-width:0; }
0273 | .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
0274 | .layout-row { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:14px; background:#f8faf7; border:1px solid var(--line); border-radius:9px; }
0278 | .advanced-settings summary { cursor:pointer; color:var(--green); font-weight:600; }
0279 | .advanced-settings fieldset { margin-top:16px; border:1px solid var(--line); border-radius:8px; padding:12px; }
0286 | .item-data-table .column-dragging { cursor:grabbing; background:#c7e0d4; }
0287 | .item-data-table .column-movable:focus-visible { outline:2px solid var(--green); outline-offset:-2px; }
0288 | .cell-value-button { display:block; width:100%; padding:6px 0; text-align:left; color:var(--ink); background:none; border:0; white-space:normal; overflow-wrap:anywhere; }
0289 | .cell-value-button:hover { color:var(--green); text-decoration:underline; }
0293 | .column-resizer { position:absolute; inset:0 -3px 0 auto; width:9px; cursor:col-resize; touch-action:none; z-index:2; border-right:2px solid #97b6a8; }
0294 | .column-resizer:focus-visible,.column-resizer:hover { background:#154d4433; outline:none; }
0297 | .column-config-row { display:flex; flex-wrap:wrap; align-items:center; gap:10px; padding:8px; background:#f7faf7; border-radius:6px; }
0308 | .catalog-row { display:flex; align-items:center; flex-wrap:wrap; justify-content:space-between; gap:8px; padding:10px; border-bottom:1px solid var(--line); }
0313 | .list-view-box { margin:10px 0 14px; border:1px solid var(--line); border-radius:9px; padding:10px 12px; background:#f8faf8; }
0318 | .list-color-editor summary { cursor:pointer; font-weight:650; color:var(--green); }
0321 | .column-filter summary { display:inline-flex; align-items:center; justify-content:center; width:25px; height:24px; border:1px solid #cadad1; border-radius:5px; background:#fff; color:#4b655c; list-style:none; font-size:14px; cursor:pointer; }
0323 | .column-filter-active summary { background:#dcefe6; border-color:var(--green); font-weight:700; color:var(--green); }
0324 | .column-filter-menu { position:absolute; top:28px; left:0; z-index:30; padding:10px; width:230px; background:#fff; border:1px solid #b8cbbf; border-radius:8px; box-shadow:var(--shadow); text-align:left; }
0325 | .column-filter-menu label { display:grid; gap:5px; color:#405d50; font-size:12px; }
0328 | .filter-chip { display:inline-flex; align-items:center; gap:5px; padding:4px 7px; border:1px solid #c5d7cd; border-radius:15px; background:#eef7f1; font-size:12px; }
0329 | .chip-remove { display:inline-grid; place-items:center; width:20px; height:20px; margin:0; border:0; border-radius:50%; background:#dae9de; cursor:pointer; font-weight:bold; }
0330 | .color-dot { display:inline-block; width:12px; height:12px; border-radius:3px; border:1px solid #bac8c0; }
0331 | .color-mint, .color-mint td { background:#e5f5e9; }
0332 | .color-amber, .color-amber td { background:#fff1cc; }
0333 | .color-rose, .color-rose td { background:#fae5e5; }
0334 | .color-blue, .color-blue td { background:#e5effb; }
0338 | .approval-control { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:14px; margin:12px 0; border:1px solid #bad2c4; border-radius:9px; background:#f5faf6; }
0340 | .approval-summary { display:flex; flex-wrap:wrap; gap:12px; padding:12px; margin-bottom:12px; background:#f1f5f2; border-radius:8px; font-size:13px; }
0341 | .approval-summary strong { font-size:19px; color:var(--green); }
0343 | .approval-row { padding:12px; border:1px solid var(--line); border-radius:9px; }
0345 | .approval-change { display:grid; grid-template-columns:minmax(100px,150px) 1fr 1fr; gap:10px; padding:8px 0; border-bottom:1px solid #ecf1ed; white-space:pre-wrap; overflow-wrap:anywhere; font-size:12px; }
0346 | .approval-change:last-child { border-bottom:0; }
0404 |   background:#f4f8f5;
0405 |   border:1px solid var(--line);
0406 |   border-radius:9px;
0418 | .options-menu > summary {width:38px;height:38px;min-width:38px;background:#fff;}
0435 |   border:0;
0436 |   border-radius:7px;
0437 |   background:transparent;
0442 |   color:var(--ink);
0447 | .options-popover > button + button {border-top:1px solid #edf0ed;}
0448 | .options-popover > button:hover {background:var(--soft);}
0449 | .options-popover > button:focus-visible {outline:2px solid var(--green);outline-offset:-2px;}
0450 | .settings-hub-tabs {display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px;padding:6px;background:#f0f5f1;border:1px solid #dce8df;border-radius:9px;}
0451 | .settings-hub-tabs button {padding:9px 12px;border:1px solid transparent;border-radius:7px;background:transparent;font-size:13px;color:#425d50;}
0452 | .settings-hub-tabs button.active {background:#fff;border-color:#d1dfd5;color:#154d44;font-weight:750;box-shadow:0 1px 3px #15302710;}
0453 | .settings-hub-tabs button:hover:not(.active):not(:disabled) {background:#e3eee7;}
0459 |   border:1px solid #d1dfd5;
0460 |   background:#fff;
0461 |   color:var(--green);
0465 | .settings-hub-tabs .shared-view-exit:hover:not(:disabled) {background:#e4eee7;}
0470 | .guest-rights-hint {padding:9px 12px;margin:6px 0 12px;border:1px solid #dce9df;border-radius:8px;background:#f5f9f6;color:#466356;font-size:12px;}
0503 | .settings-section {margin:0 0 15px;padding:12px 14px 10px;background:#fff;border:1px solid #d6e3da;border-radius:11px;box-shadow:0 2px 9px #1530270a;}
0504 | .settings-section-path {font-size:11px;font-weight:700;color:#608071;margin:0 0 9px;}
0505 | .settings-section-path span {padding:0 5px;color:#97a99d;}
0506 | .settings-sub-tabs {display:flex;gap:6px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #e2ebe5;padding-bottom:7px;}
0507 | .settings-sub-tabs button {border:1px solid transparent;border-radius:7px;padding:9px 12px;background:transparent;color:#536c5e;font-size:13px;font-weight:600;}
0508 | .settings-sub-tabs button:hover:not(:disabled) {background:#f2f7f3;}
0509 | .settings-sub-tabs button.active {background:#e8f2eb;border-color:#bad7c5;color:#184f3d;font-weight:750;box-shadow:inset 0 -2px #44866b;}
0510 | .settings-sub-tabs button:focus-visible {outline:2px solid #357a5a;outline-offset:2px;}
0512 | .settings-section-description {font-size:12px;color:#5b7365;margin:9px 0 0;line-height:1.5;}
0513 | .catalog-relationship {margin-top:12px;padding:9px 12px;border:1px solid #d7e5db;border-radius:8px;background:#f9fbf9;}
0514 | .catalog-relationship>summary {cursor:pointer;font-weight:700;color:#315b48;font-size:13px;}
0516 | .catalog-relationship .advanced-settings {background:#fff;margin:0;}
0521 | .item-heading-row .column-sort-button{display:inline-grid;place-items:center;flex:none;width:19px;height:24px;min-height:24px;padding:0;border:1px solid transparent;border-radius:5px;background:transparent;color:#496a58;font-size:15px;font-weight:700;cursor:pointer;touch-action:manipulation;opacity:.36;transition:opacity .12s ease,background .12s ease}
0522 | .item-heading-row .column-sort-button:hover,.item-heading-row .column-sort-button:focus-visible{background:#e1eee6;border-color:#bad4c5;outline:none;color:#18543c}
0523 | .item-heading-row .column-sort-button.active{color:#155d42;background:#dfede3;border-color:#accfbb;opacity:1}
0524 | .item-heading-row th[aria-sort="ascending"],.item-heading-row th[aria-sort="descending"]{background:#e4f1e8}
0528 | .layout-loading-placeholder{width:min(100%,var(--page-content-width,100%));margin:0 auto;padding:22px 18px;border:1px solid var(--line);border-radius:10px;background:#fff;color:#587065;font-size:13px}
0552 | .report-table .report-total-col {font-weight:750;background:#f0f5f1;}
0555 |  .report-stage-summary {display:inline-flex;align-items:center;gap:8px;min-height:36px;box-sizing:border-box;padding:7px 11px;border-radius:7px;font-size:13px;color:#526b5e;}
0556 |  .report-stage-summary strong {font-size:15px;color:#234b3e;font-variant-numeric:tabular-nums;}
0557 | .report-flow-note {margin:3px 0 10px;color:var(--muted);font-size:11px;line-height:1.5;}
0558 | .report-focus-button[aria-pressed="true"] {background:#e9f3ee;border:1px solid #b8d5c4;}
0566 | .card-header .report-section-kicker{margin:0 0 4px;font-size:10px;letter-spacing:.095em;font-weight:750;color:#557b68}
0591 |   background:#f3f5f8;color:#293b4b;
0593 |   border-right:1px solid #dbe1e8;
0595 | .report-table thead th {background:#edf1f6;color:#34465a;white-space:normal;line-height:1.35;}
0599 | .report-table .report-total-col {background:#eef4fc;color:#1c426f;font-weight:750;}
0600 | .report-table .report-percent-col {background:#f0faf4;color:#276447;}
0605 | .report-percent-value progress {width:72px;max-width:calc(100% - 48px);height:7px;flex:0 1 72px;accent-color:#28865c;border:0;border-radius:20px;overflow:hidden;}
0606 | .report-percent-value progress::-webkit-progress-bar {background:#dce4df;border-radius:20px;}
0607 | .report-percent-value progress::-webkit-progress-value {background:#31a06b;border-radius:20px;}
0608 | .report-percent-value progress::-moz-progress-bar {background:#31a06b;border-radius:20px;}
0609 | .report-table tfoot th,.report-table tfoot td {font-weight:750;border-top:2px solid #cbd7df;}
0611 | .report-visual-config {display:grid;gap:12px;padding:13px;border:1px solid #d5e4db;border-radius:10px;background:#f9fcfa;margin-bottom:14px;}
0614 | .report-visual-option {display:grid;gap:5px;border:1px solid #d5e0d9;padding:11px 12px;background:#fff;border-radius:9px;cursor:pointer;min-width:0;}
0615 | .report-visual-option:has(input:checked) {border-color:#37775b;box-shadow:inset 0 0 0 1px #37775b;background:#f0f8f3;}
0617 | .report-visual-option small {font-size:11px;color:#5d7568;line-height:1.4;}
0620 | .report-font-hint {font-size:11px;color:#5a7165;margin:0;}
0625 |   .report-table .report-group-heading {background:#f3f5f8!important;}
0632 |  --source-bg:var(--hdnd-status-not-submitted-bg,#FFE0E4);--source-ink:var(--hdnd-status-not-submitted-text,#7F1D30);--source-stroke:#E7A1AD;--source-solid:var(--hdnd-status-not-submitted-text,#9B1731);
0633 |  --office-bg:var(--hdnd-status-office-bg,#FFE8B8);--office-ink:var(--hdnd-status-office-text,#704500);--office-stroke:#DCB76A;--office-solid:var(--hdnd-status-office-text,#865000);
0634 |  --next-bg:#DCEBFD;--next-ink:#164C89;--next-stroke:#A1C6EF;--next-solid:#124E8C;
0635 |  --completed-bg:var(--hdnd-status-done-bg,#D5F0DE);--completed-ink:var(--hdnd-status-done-text,#125B35);--completed-stroke:#91CFA8;--completed-solid:var(--hdnd-status-done-text,#126442);
0636 |  --withdrawn-bg:#ECE8F5;--withdrawn-ink:#5B3B78;--withdrawn-stroke:#CEC0DB;--withdrawn-solid:#563583;
0637 |  --other-bg:#EBEFF2;--other-ink:#3D5261;--other-stroke:#CBD5DC;--other-solid:#405460;
0645 |   --stage-bg:#F8FBFE;--stage-ink:#315A7A;
0646 |   --stage-stroke:#E2EDF8;--stage-solid:#315A7A;
0656 | .report-surface .report-table tfoot th:first-child {background:#E8EEF3;color:#283746;}
0658 | .report-surface .report-table :is(td,th).report-total-col {background:#E9F0FA;color:#163C68;}
0659 | .report-surface .report-table :is(th,td).report-percent-col {background:#E7F3EA;color:#205C39;}
0661 | .report-surface .report-table .report-count-mark {display:inline-flex;align-items:center;justify-content:center;min-width:30px;color:inherit;}
0663 |  color:inherit;background:transparent;border:1px solid currentColor;font-weight:750;
0667 |  color:inherit;background:rgba(127,127,127,.12);outline:2px solid currentColor;outline-offset:1px;
0671 |  background:var(--stage-bg);color:var(--stage-ink);border:1px solid var(--stage-stroke);
0673 | .report-surface .report-flow-summary .report-stage-summary[class*="report-stage-"] strong {color:inherit;}
0676 |  background:var(--stage-bg);color:var(--stage-ink);border-color:var(--stage-stroke);
0679 | .report-surface.report-style-signal .report-table thead th[class*="report-stage-"] {background:#F8FAFC;color:var(--stage-ink);}
0681 |  display:inline-block;padding:5px 7px;border-radius:5px;
0682 |  border:1px solid var(--stage-stroke);background:var(--stage-bg);color:var(--stage-ink);
0684 | .report-surface.report-style-signal .report-table tbody td[class*="report-stage-"] {background:#fff;color:var(--stage-ink);}
0686 |  min-width:34px;min-height:34px;padding:0 3px;border-radius:999px;
0687 |  background:var(--stage-bg);border:1px solid var(--stage-stroke);
0690 |  border:0;width:auto;height:auto;min-height:0;padding:4px 8px;background:transparent;
0692 | .report-surface.report-style-signal .report-table tfoot td[class*="report-stage-"] {background:#F8FAFC;color:var(--stage-ink);}
0695 |  background:#F8FAFC;color:var(--stage-ink);border-bottom:4px solid var(--stage-solid);
0698 |  background:#fff;color:var(--stage-ink);box-shadow:inset 4px 0 var(--stage-solid);
0700 | .report-surface.report-style-compact .report-table .count-button {border-color:transparent;}
0704 |  background:#F8FAFC;color:var(--stage-ink);border-bottom:3px solid var(--stage-solid);
0707 |  background:#fff;color:var(--stage-ink);
0710 |  background:linear-gradient(to right,var(--stage-bg) 0%,var(--stage-bg) var(--bar-fill),#fff var(--bar-fill),#fff 100%);
0713 |  color:var(--stage-ink);background:#F8FAFC;border-top:3px solid var(--stage-solid);
0715 | .report-surface.report-style-bars .report-table .count-button {border-color:transparent;}
0718 |   background:var(--stage-bg);color:var(--stage-ink);border-color:var(--stage-stroke);
0721 |  background:#fff;color:var(--stage-ink);
0723 | .report-surface.report-style-band .report-table tbody tr:nth-child(even) td[class*="report-stage-"] {background:#F8FAFC;}
0725 |  padding:1px 8px;border-bottom:2px solid var(--stage-stroke);
0727 | .report-surface.report-style-band .report-table tfoot td[class*="report-stage-"] {background:var(--stage-bg);color:var(--stage-ink);}
0728 | .report-surface.report-style-band .report-table .count-button {border-color:transparent;}
0731 |  background:var(--stage-bg);color:var(--stage-ink);border-color:var(--stage-stroke);
0735 |  border-bottom-color:var(--stage-stroke);
0738 |  box-shadow:inset 4px 0 var(--stage-stroke);
0747 |  min-height:51px;border:1px solid #E3E8ED;border-radius:5px;background:#fff;overflow:hidden;}
0750 | .report-example-source {--mini-bg:#FFE0E4;--mini-ink:#7F1D30;--mini-stroke:#E7A1AD;--mini-solid:#9B1731;--mini-bar:90%;}
0751 | .report-example-office {--mini-bg:#FFF5E8;--mini-ink:#704500;--mini-stroke:#EAD7BC;--mini-solid:#865000;--mini-bar:55%;}
0752 | .report-example-next {--mini-bg:#F3F8FE;--mini-ink:#164C89;--mini-stroke:#D8E6F5;--mini-solid:#124E8C;--mini-bar:35%;}
0753 | .report-example-completed {--mini-bg:#D5F0DE;--mini-ink:#125B35;--mini-stroke:#91CFA8;--mini-solid:#126442;--mini-bar:22%;}
0754 | .report-visual-option.report-style-classic .report-example-cell {background:var(--mini-bg);color:var(--mini-ink);border-color:var(--mini-stroke);}
0755 | .report-visual-option.report-style-signal .report-example-cell b {background:var(--mini-bg);color:var(--mini-ink);border-bottom:1px solid var(--mini-stroke);}
0756 | .report-visual-option.report-style-signal .report-example-cell i {background:var(--mini-bg);color:var(--mini-ink);border:1px solid var(--mini-stroke);border-radius:99px;}
0757 | .report-visual-option.report-style-compact .report-example-cell {border-left:4px solid var(--mini-solid);color:var(--mini-ink);}
0758 | .report-visual-option.report-style-compact .report-example-cell b {border-bottom:2px solid var(--mini-solid);}
0759 | .report-visual-option.report-style-bars .report-example-cell {color:var(--mini-ink);}
0760 | .report-visual-option.report-style-bars .report-example-cell b {border-bottom:2px solid var(--mini-solid);}
0761 | .report-visual-option.report-style-bars .report-example-cell i {width:90%;background:linear-gradient(to right,var(--mini-bg) var(--mini-bar),#fff var(--mini-bar));}
0762 | .report-visual-option.report-style-band .report-example-cell b {background:var(--mini-solid);color:#fff;}
0763 | .report-visual-option.report-style-band .report-example-cell i {color:var(--mini-ink);}
0765 | .report-font-size-control input[type="range"] {width:180px;accent-color:#205e44;cursor:pointer;}
0776 |    background:var(--stage-bg)!important;color:var(--stage-ink)!important;
0779 |    background:var(--stage-solid)!important;color:#fff!important;
0782 |    background:var(--stage-bg)!important;color:var(--stage-ink)!important;
0783 |    border-color:var(--stage-stroke)!important;
0797 | .report-table .column-resizer {right:-3px;width:10px;border-right:2px solid #9ab7a9;z-index:6;}
0799 | .report-table .column-resizer:hover,.report-table .column-resizer:focus-visible {background:rgba(38,117,82,.16);border-right-color:#227451;}
0809 |   border-radius:7px;border:1px solid currentColor;font-variant-numeric:tabular-nums;
0816 |   background:rgba(73,124,98,.13);box-shadow:0 1px 4px rgba(22,61,44,.15);
0831 |   border:0;border-radius:0;box-shadow:none;outline:none;
0832 |   background:transparent;color:inherit;cursor:pointer;transition:none;
0840 |   color:inherit;
0841 |   background:rgba(9,106,113,.14);
0842 |   outline:2px solid #08777B;
0844 |   box-shadow:none;
0848 |   outline-color:#07595B;
0857 |   padding:6px 9px;border:1px solid #334D42;border-radius:6px;
0858 |   background:#263F35;color:#fff;
0877 |   gap:12px;align-items:end;border-bottom:1px solid #dce7e1;background:#f8fbf9;}
0879 | .report-grid-summary strong {font-size:14px;color:#234639;}
0881 | .report-grid-draft {color:#9b5716;font-size:12px;font-weight:650;}
0883 |   max-width:420px;font-size:12px;font-weight:600;color:#405b50;}
0885 |   border:1px solid #b8cfc1;border-radius:7px;padding:6px 10px;background:#fff;}
0888 |   border:1px solid #ccded3;border-radius:7px;background:#fff;font-size:12px;
0889 |   font-weight:650;color:#335748;white-space:nowrap;}
0891 |   box-sizing:border-box;height:30px;padding:4px 7px;border:1px solid #b4cbbf;
0892 |   border-radius:5px;background:#fff;font-variant-numeric:tabular-nums;color:#193f31;}
0896 | .report-grid-settings {flex:none;padding:12px 16px;background:#f5faf6;
0897 |   border-bottom:1px solid #cdded4;max-height:min(36vh,340px);overflow:auto;}
0898 | .report-grid-settings-intro p {margin:4px 0 9px;color:#5e7067;font-size:12px;}
0901 | .report-grid-window-width-control input {width:90px;padding:6px 7px;border:1px solid #a9c8b9;border-radius:6px;}
0905 |   min-width:0;background:#fff;padding:5px 7px;border:1px solid #dce7df;border-radius:7px;font-size:12px;}
0911 | .report-grid-settings-buttons input {width:62px;padding:4px;border:1px solid #c0d5c8;border-radius:4px;}
0914 |   scrollbar-gutter:stable;background:#fff;}
0915 | .report-detail-grid {width:max-content;min-width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;}
0917 |   border-right:1px solid #e3ebe6;border-bottom:1px solid #e6ede8;padding:7px 9px;
0919 | .report-detail-grid thead th {position:sticky;top:0;z-index:2;color:#28453b;
0920 |   background:#e5efe9;height:46px;vertical-align:middle;white-space:normal;}
0922 |   background:#f5faf7;padding:5px;}
0923 | .report-grid-sort {text-align:left;font-weight:700;border:none;background:transparent;color:inherit;
0925 | .report-grid-sort small {color:#587967;}
0927 |   border:1px solid #cadcd0;border-radius:5px;padding:4px 6px;font-size:12px;background:#fff;}
0928 | .report-detail-grid tbody tr:nth-child(even){background:#f8faf9;}
0932 |   box-sizing:border-box;width:100%;max-width:100%;border:1px solid #a6c4b5;border-radius:6px;
0933 |   background:#fff;padding:5px 6px;font:inherit;color:#233b31;}
0954 |   border-right:2px solid #528b79;}
0957 |   background:rgba(17,120,102,.14);border-right-color:#08777b;}
0959 | .report-grid-modal .report-detail-grid .column-dragging {cursor:grabbing;background:#c4e7d9;}
0960 | .report-grid-modal .report-detail-grid .column-movable:focus-visible {outline:2px solid #08777b;outline-offset:-2px;}
0964 |   padding:2px 5px;border:0;border-radius:5px;background:transparent;color:#406d5b;cursor:pointer;}
0966 | .report-grid-modal .report-detail-grid .column-sort-button:focus-visible {background:#d0e5d9;}
0968 |   background:#f5faf7;z-index:3;}
0972 |   height:29px;padding:3px 18px 3px 5px;border:1px solid #b9cfc3;border-radius:5px;background:#fff;font-size:11px;}
0974 |   min-width:19px;width:19px;height:21px;padding:0;cursor:pointer;border:0;border-radius:3px;background:#dfede5;}
0976 |   padding:7px 16px;border-bottom:1px solid #e0e9e2;background:#fbfcfb;}
0980 |   border:1px solid #bfd0c6;border-radius:5px;background:#fff;padding:3px 7px;font-size:12px;}
0983 |   border:1px solid #bd9557;background:#fff8e9;padding:9px 15px;font-size:12px;}
0985 |   border:1px solid #c7dfd3;border-radius:7px;background:#fff;}
0986 | .report-grid-modal .report-grid-color-config summary {cursor:pointer;color:#375c48;font-weight:650;font-size:12px;}
0992 |   font-size:11px;background:#eef6ef;border:1px solid #c7dfd1;border-radius:5px;padding:4px 7px;margin:3px;}
0993 | .report-grid-modal .report-grid-color-chip button {border:none;background:transparent;cursor:pointer;font-size:15px;}
0996 | .report-grid-modal .report-detail-grid tbody tr.report-grid-color-mint td {background:#e4f5ea;}
0997 | .report-grid-modal .report-detail-grid tbody tr.report-grid-color-amber td {background:#fff3d8;}
0998 | .report-grid-modal .report-detail-grid tbody tr.report-grid-color-rose td {background:#fce8e6;}
0999 | .report-grid-modal .report-detail-grid tbody tr.report-grid-color-blue td {background:#e7f0fa;}
1018 | .report-detail-grid tbody td .content-button {color:inherit;}
1059 |   border:1px solid transparent;
1060 |   border-radius:5px;
1061 |   color:#57786e;
1062 |   background:transparent;
1072 |   background:#e5f0e9;
1073 |   border-color:#a9cbbc;
1074 |   outline:2px solid #6d9e87;
1100 |   text-align:center;border:1px solid #accabc;border-radius:6px;
1101 |   background:rgba(247,252,249,.94);
1102 |   box-shadow:inset 0 0 0 1px rgba(255,255,255,.42);
1108 |   border-right:1.6px solid #37745e;border-bottom:1.6px solid #37745e;
1113 |   border-color:#35876a;background:#edf7f1;
1117 |   outline:2px solid #1c8261;outline-offset:1px;
1125 |   box-sizing:border-box;padding:5px 7px;border:1px solid #305745;
1126 |   border-radius:6px;background:#254a3a;color:#fff;
1128 |   box-shadow:0 2px 6px rgba(10,33,22,.13);contain:layout style paint;
1140 |   padding:6px 11px;margin:5px 0 7px;background:#f2f7f3;
1141 |   border-color:#d6e5dc;color:#536b5f;font-size:11px;
1153 |   min-height:45px;padding:7px 0;justify-content:flex-end;border-bottom:0;
1160 |   padding:4px 9px;border:1px solid #d8e3dc;border-radius:7px;
1161 |   background:#f3f7f4;color:#526b5d;font-size:11px;font-weight:650;
1165 |   gap:12px;margin:8px auto 17px;padding:0;border:0;min-height:0;
1171 |   border:1px solid #cadbd1;border-radius:13px;
1172 |   background:#fff;color:#285343;box-shadow:0 1px 3px rgba(32,63,48,.045);
1177 |   border-color:#4d9473;background:linear-gradient(120deg,#e9f5ed,#f5faf6);
1178 |   color:#174f3b;box-shadow:inset 4px 0 0 #247c57,0 2px 9px rgba(19,84,55,.10);
1181 |   border-color:#6ba98a;background:#f7fbf8;box-shadow:0 2px 7px rgba(24,74,48,.085);
1184 |   outline:2px solid #207b55;outline-offset:2px;
1192 |   background:#eff5f0;border:1px solid #d7e5da;border-radius:11px;
1193 |   color:#3b7858;font-size:25px;font-weight:600;
1196 |   background:#d5eadc;border-color:#acd2ba;color:#146444;
1203 |   font-weight:750;color:inherit;
1206 |   display:block;font-size:12px;line-height:1.4;font-weight:450;color:#708377;
1210 |   flex:none;min-width:68px;padding:5px 7px;border-radius:6px;
1211 |   background:#f3f7f4;color:#678172;font-size:11px;font-weight:650;
1214 |   background:#cce7d6;color:#1a6344;
1217 | .account-source-details {padding:7px 10px;border-radius:8px;border:1px solid #d7e7db;background:#f7faf7;font-size:12px;}
1218 | .account-source-details summary {cursor:pointer;font-weight:600;color:#4c6859;}
1237 |   border-width:1.5px;border-radius:12px;
1238 |   box-shadow:0 2px 6px rgba(25,60,64,.10);
1241 |   background:#FBFCFD;
1242 |   border-color:#E6EBEF;color:#637480;
1245 |   background:#FBFCFD;
1246 |   border-color:#E6EBEF;color:#637480;
1249 |   background:linear-gradient(120deg,#1d578b,#2878a6);
1250 |   border-color:#164e82;color:#fff;
1251 |   box-shadow:inset 4px 0 0 #b6dbff,0 4px 13px rgba(30,78,125,.24);
1254 |   background:linear-gradient(120deg,#166a55,#258a6a);
1255 |   border-color:#125b47;color:#fff;
1256 |   box-shadow:inset 4px 0 0 #b5f3d5,0 4px 13px rgba(22,98,76,.23);
1259 |   filter:none;border-color:#B9C9D2;
1260 |   box-shadow:0 3px 12px rgba(20,69,76,.16);
1263 |   width:36px;height:36px;border-radius:9px;font-size:21px;
1264 |   background:#ffffffb8;border-color:#ffffff9c;color:inherit;
1267 |   background:#ffffff25;border-color:#ffffff66;color:#fff;
1273 |   font-size:11px;color:inherit;opacity:.80;font-weight:450;
1276 |   min-width:49px;padding:4px 6px;background:#ffffff91;color:inherit;font-size:10px;
1279 |   background:#ffffff28;color:#fff;border:1px solid #ffffff75;
1293 |   color:#9aa9a0;font-weight:400;
1297 |   color:#244d3e;font-weight:600;
1301 |   color:#253a30;
1311 |   border:1.5px solid #b7cbd6;
1312 |   border-radius:7px;
1313 |   background:#f2f6f9;
1314 |   color:#426274;
1316 |   box-shadow:inset 0 1px 0 #ffffffd0;
1320 |   border-color:#87aaba;background:#eaf1f5;
1321 |   box-shadow:0 0 0 1px #bdd3df;
1325 |   outline:2px solid #356d86;outline-offset:1px;background:#eaf1f5;
1329 |   border-right-color:#60879a;border-bottom-color:#60879a;
1338 |   content:'✎';flex:none;color:#60879a;font-size:12px;
1346 |   --workflow-bg:#fff3d5;--workflow-border:#dba84e;--workflow-fg:#825100;
1350 |   --workflow-bg:#e4efff;--workflow-border:#78a6dc;--workflow-fg:#184e8a;
1354 |   --workflow-bg:#e1f5e9;--workflow-border:#6eb78b;--workflow-fg:#14673c;
1359 |   padding:5px 8px;border:1px solid var(--workflow-border);border-radius:7px;
1360 |   color:var(--workflow-fg);background:var(--workflow-bg);
1366 |   content:"";display:block;flex:none;width:6px;height:6px;border-radius:50%;
1367 |   background:var(--workflow-fg);
1373 |   background:var(--workflow-bg);border-color:var(--workflow-border);
1374 |   color:var(--workflow-fg);font-weight:750;
1378 |   border-color:var(--workflow-fg);box-shadow:0 0 0 1px var(--workflow-border);
1386 |   background:#edf4ef;
1388 | .report-grid-modal .report-grid-filter-row .item-column-filter-cell {background:#f9fcfa;}
1395 |   --workflow-bg:#FFE0E4;--workflow-border:#E7A1AD;--workflow-fg:#7F1D30;
1399 |   --workflow-bg:#FFE8B8;--workflow-border:#DCB76A;--workflow-fg:#704500;
1403 |   --workflow-bg:#D5F0DE;--workflow-border:#91CFA8;--workflow-fg:#2B7450;
1411 |   background-color:var(--workflow-bg);
1412 |   border-color:var(--workflow-border);
1413 |   color:var(--workflow-fg);
1419 |   background-color:var(--workflow-bg);
1423 |   background:#125B35;
1425 | /* Softer completed lettering (WCAG >= 4.5:1 on #D5F0DE).
1436 |   background:#f6f9f7;
1439 |   background:#fbfdfc;
1454 |   --workflow-text:#D00025;
1458 |   --workflow-text:#B04700;
1462 |   --workflow-text:#007A18;
1468 |   color:var(--workflow-text);
1478 |   --workflow-bg:var(--hdnd-status-not-submitted-bg,#FFE0E4);
1479 |   --workflow-text:var(--hdnd-status-not-submitted-text,#D00025);
1483 |   --workflow-bg:var(--hdnd-status-office-bg,#FFE8B8);
1484 |   --workflow-text:var(--hdnd-status-office-text,#B04700);
1488 |   --workflow-bg:var(--hdnd-status-done-bg,#D5F0DE);
1489 |   --workflow-text:var(--hdnd-status-done-text,#007A18);
1493 |   --workflow-bg:var(--hdnd-status-other-bg,#F2F6F9);
1494 |   --workflow-text:var(--hdnd-status-other-text,#426274);
1495 |   --workflow-fg:#426274;
1496 |   --workflow-border:#B7CBD6;
1514 |   border:1px solid #b8c8c5;border-radius:8px;background:var(--surface,#fff);color:inherit;
1519 |   align-content:start;padding:14px;border:1px solid #dbe4e1;border-radius:12px;
1520 |   background:rgba(247,250,249,.75);
1524 | .status-palette-row-heading small {color:#687b76;font-size:12px;}
1533 |   border:1px solid #b8c8c5;border-radius:7px;background:#fff;
1538 |   border:1px solid #b8c8c5;border-radius:7px;background:#fff;color:#243c35;
1542 |   padding:9px;border-radius:7px;font-size:13px;font-weight:600;
1545 | .status-palette-presets {border-top:1px solid #dbe4e1;padding-top:10px;}
1547 | .status-palette-presets small {display:block;color:#65766f;margin-top:8px;}
1558 |   background:#F8FAFB;color:#334C54;border:1.5px solid #D4E0E2;
1559 |   box-shadow:0 2px 6px rgba(20,69,76,.09);cursor:pointer;
1562 |   background:#E3F2EA;color:#163F34;border:2.5px solid #15805F;
1563 |   box-shadow:0 0 0 2px #A7D3BE,0 5px 16px rgba(18,91,68,.20);
1567 |   background:transparent;border-color:transparent;color:inherit;
1571 |   background:transparent;border:0;color:inherit;font-weight:750;
1575 |   border-color:#15805F;box-shadow:0 0 0 2px #C0E2D2,0 5px 14px rgba(25,83,70,.15);
1578 |   outline:3px solid #166B50;outline-offset:3px;
1583 |   text-decoration:none;color:inherit;cursor:pointer;
1592 |   box-shadow:inset 0 0 0 2px #408A75,0 0 0 1px #C8E3D7;
1595 |   box-shadow:inset 0 0 0 2px #166A53,0 0 0 2px #A6D4C0;
1598 |   width:100%;min-height:30px;padding:5px 7px;background:transparent;color:inherit;
1599 |   border:1px solid #A5BEB5;border-radius:6px;text-align:left;white-space:pre-wrap;
1603 |   background:#EFF8F3;border-color:#26785C;box-shadow:0 0 0 1px #A2CCB6;
1609 |   font:inherit;line-height:1.5;color:var(--ink);background:#FFF;
1610 |   border:2px solid #26785C;border-radius:6px;box-shadow:0 0 0 2px #C6E5D6;
1613 |   outline:2px solid #126046;outline-offset:1px;
1618 | .report-heading-count {font-size:.84em;font-weight:600;color:#476357;white-space:nowrap;}
1621 | .build-count-setting small {color:var(--muted);}
1635 |   background:#F6F8F7;color:#526B5E;border:1px solid #D4E0D9;border-radius:7px;
1641 |   box-shadow:0 1px 5px rgba(25,77,60,.19),0 0 0 1px var(--stage-ink,#51705f);
1645 |   outline:2px solid #166B50;outline-offset:3px;
1655 |   .report-flow-summary button.report-stage-summary {box-shadow:none;transform:none;}
1661 |   box-shadow:none;
1673 |   border-color:#20775B;
1674 |   box-shadow:0 0 0 2px #B7DECC;
1682 |   outline:none;
1683 |   box-shadow:none;
1692 |   border-radius:6px;
1696 |   border-color:#9ECFE7;
1697 |   outline:none;
1698 |   box-shadow:0 0 0 2px #D8F1FC;
1704 |   border-color:#9ECFE7;
1705 |   outline:none;
1706 |   box-shadow:0 0 0 2px #D8F1FC;
1709 |   border-color:#9ECFE7;
1710 |   outline:none;
1711 |   box-shadow:0 0 0 2px #D8F1FC;
1718 |   outline:none;
1719 |   box-shadow:none;
1727 |   border-radius:6px;
1741 |   outline:none;
1742 |   border-color:#A7D8ED;
1743 |   box-shadow:0 0 0 2px #DDF3FD;
1750 |   outline:none;
1751 |   border-color:#A7D8ED;
1752 |   box-shadow:0 0 0 2px #DDF3FD;
1755 |   outline:none;
1756 |   border-color:#A7D8ED;
1757 |   box-shadow:0 0 0 2px #DDF3FD;
1766 |   border:1px solid #CDD9D4;
1767 |   outline:none;
1768 |   box-shadow:none;
1771 |   border-color:#A7D8ED;
1772 |   box-shadow:0 0 0 2px #DDF3FD;
1786 |   border-color:#A7D8ED;
1787 |   box-shadow:0 7px 13px rgba(41,89,112,.20),0 0 0 2px #DDF3FD;
1801 |   border-color:#A7D8ED;
1802 |   box-shadow:0 7px 13px rgba(41,89,112,.20),0 0 0 2px #DDF3FD;
1824 |     box-shadow:none!important;
1833 |   color:#3D728A; /* lighter blue-teal, >= 5:1 against #F8FAFB */
1837 |   color:#24745B; /* brighter green-teal, >= 4.8:1 against #E3F2EA */
1841 |   color:inherit;opacity:1;
1847 |   border-color:#62A7CF;
1848 |   box-shadow:0 7px 13px rgba(41,89,112,.20),0 0 0 2px #DDF3FD;
1860 |   outline:0;
1861 |   background:transparent;
1862 |   box-shadow:none;
1868 |   border:1px solid transparent;border-radius:7px;
1873 |   border-color:#A7D8ED;
1874 |   box-shadow:0 7px 13px rgba(41,89,112,.20),0 0 0 2px #DDF3FD;
1877 |   border-color:#62A7CF;
1878 |   outline:2px solid #2B7190;outline-offset:2px;
1881 |   outline:0;
1882 |   background:transparent;
1895 |   border-color:#A7D8ED;
1896 |   box-shadow:0 7px 13px rgba(41,89,112,.20),0 0 0 2px #DDF3FD;
1899 |   box-shadow:none;outline:none;
1926 |     transform:none!important;box-shadow:none!important;
1935 |   border-color:#9ECFE7;
1966 |   color:#426274;
1970 |   color:var(--workflow-text);
1974 |   color:inherit;
1978 |   background:#FFE18B;color:inherit;
1979 |   border-radius:2px;padding:0 1px;
2099 |   display:inline;padding:0;border:0;margin:0;
2101 |   background:#FFE18B;color:inherit;border-radius:2px;
2123 |   border-width:2.5px;
2150 |   box-shadow:0 7px 13px rgba(41,89,112,.20),0 0 0 2px #DDF3FD;
2151 |   outline:1px solid #A7D8ED;outline-offset:0;
2152 |   border-radius:6px;
2156 |   transform:none;border-color:transparent;
2157 |   box-shadow:none;outline:none;
2169 |     transform:none!important;box-shadow:none!important;outline:none!important;
2204 |   border:1px solid transparent;
2208 |   border-width:1px;
```

## `source/src/features/items/item-frame.css`

Git blob SHA `679f62d2582ff399b65a56a21160587e2ad27473`; 145 relevant source lines / 705 total.

```text
0022 |   background: #f4f8f5; border: 1px solid #d9e8dd; border-radius: 8px;
0028 | .deferred-width-field input[aria-invalid="true"] { border-color: #b8463b; }
0029 | .deferred-width-error { display: block; color: #b8463b; font-size: 12px; }
0030 | .layout-invalid-recovery { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border: 1px solid #e6b5a7; border-radius: 8px; padding: 10px 12px; background: #fff4ef; color: #923f31; }
0031 | .layout-invalid-recovery button { border-color: #e6b5a7; }
0039 |   padding: 10px 12px; background: #f8faf8; border: 1px solid var(--line); border-radius: 10px;
0041 | .customize-mode-tabs { display: inline-flex; flex-wrap: wrap; gap: 5px; padding: 4px; background: #e9efeb; border-radius: 9px; }
0043 |   min-height: 36px; padding: 7px 13px; border: 1px solid transparent; border-radius: 7px;
0044 |   color: #496057; background: transparent; font-size: 13px; font-weight: 650;
0046 | .customize-mode-tabs .mode-tab:hover:not(:disabled) { background: #fff; }
0047 | .customize-mode-tabs .mode-tab.active { color: var(--green); background: var(--surface); border-color: #d0ded5; box-shadow: 0 1px 4px #18382f14; }
0048 | .customize-mode-tabs .mode-tab:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
0055 | .permission-panel-header h3 { margin: 2px 0 4px; color: var(--green); font-size: 16px; }
0058 | .permission-stats span { background: #f3f6f3; border: 1px solid #dde7df; border-radius: 8px; padding: 7px 10px; white-space: nowrap; }
0059 | .permission-stats strong { font-variant-numeric: tabular-nums; color: #234d41; }
0061 |   font-size: 12px; line-height: 1.6; background: #f4f7f5; border: 1px solid #dbe5de;
0062 |   padding: 10px 12px; border-radius: 8px; color: #365449;
0065 | .permission-explainer summary { color: var(--green); cursor: pointer; width: max-content; max-width: 100%; font-weight: 600; }
0067 | .permission-risk { border-left: 3px solid #ad8b48; background: #fcfaf5; padding: 8px 12px; color: #6f5a2f; font-size: 12px; line-height: 1.6; }
0071 | .permission-table-scroll { max-height: min(670px, 72vh); border-radius: 10px; }
0072 | .inline-permission-table { min-width: 850px; width: max-content; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
0075 |   border-right: 1px solid #edf1ed; border-bottom: 1px solid #e5ece6;
0077 | .inline-permission-table thead th { position: sticky; top: 0; z-index: 3; background: #f0f5f1; text-align: left; }
0078 | .inline-permission-table tr > :first-child { min-width: 154px; width: 154px; max-width: 170px; position: sticky; left: 0; z-index: 2; background: #fff; box-shadow: 1px 0 #e0e8e1; }
0079 | .inline-permission-table thead tr > :first-child { z-index: 4; background: #f0f5f1; }
0080 | .inline-permission-table tbody tr:hover > :first-child { background: #f6faf7; }
0086 |   color: #4a6357; font-size: 11px; line-height: 1.2; font-weight: 500; cursor: pointer;
0091 | .inline-permission-table .permission-effective-label { color: #65756d; font-size: 11px; font-weight: 650; }
0093 |   color: #5d6446; background: #f3f1e7; border: 1px solid #e2deca; border-radius: 4px;
0096 | .inline-permission-table td.permission-effective-allow { background: #f6faf7; }
0097 | .inline-permission-table td.permission-effective-allow .permission-effective-label { color: #26704d; }
0098 | .inline-permission-table td.permission-effective-deny { background: #fff; }
0100 |   display: block; margin-top: 5px; color: #7b8980; font-size: 11px; line-height: 1.35;
0105 |   padding: 11px 12px; border: 1px solid #e5d6ae; background: #fff9eb; border-radius: 8px;
0110 |   padding: 12px; background: #f8faf8; border: 1px solid var(--line); border-radius: 9px;
0113 | .permission-save-status { font-size: 12px; color: var(--muted); }
0115 | .permission-action-bar {position:sticky;top:42px;z-index:9;box-shadow:0 3px 10px #18382f12;}
0117 |   display:grid;gap:8px;padding:13px;border-radius:9px;
0118 |   border:1px solid #e5c58b;background:#fff9eb;color:#684c23;
0134 |   color: #7a2622; background: #fff0ee; border: 1px solid #e9bdb8;
0135 |   border-left: 4px solid #b8463b; border-radius: 8px;
0138 | .layout-save-alert > .muted { width: 100%; color: #845c59; }
0156 |   border: 1px solid #e9bdb8; border-left: 4px solid #b8463b;
0157 |   padding: 10px 12px; border-radius: 8px; background: #fff1ef; color: #852f29;
0194 | .item-data-region .item-sticky-search-controls {position:sticky;top:0;z-index:8;padding:6px 0;background:#fff;box-shadow:0 2px 0 #e4eee8;}
0195 | .source-column-visibility {display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:2px 0 5px;color:#5a7568;font-size:11px;}
0198 | .item-data-table thead .item-heading-row th {position:sticky;top:0;z-index:5;height:44px;max-height:44px;box-sizing:border-box;white-space:nowrap;background:#e5eee9;}
0199 | .item-data-table thead .item-column-filter-row th {position:sticky;top:44px;z-index:5;height:43px;box-sizing:border-box;padding:4px 5px;background:#f7faf8;border-bottom:2px solid #bfd5c7;}
0200 | .item-data-table .item-column-filter-cell.has-filter {background:#e0f1e8;}
0202 | .item-data-table .item-column-filter-row input,.item-data-table .item-column-filter-row select {width:100%;min-width:0!important;min-height:30px;height:30px;font-size:11px;padding:4px 7px;border:1px solid #c7d6cd;border-radius:5px;background:#fff;}
0203 | .item-data-table .item-column-filter-row input::placeholder {color:#7f9488;}
0204 | .item-data-table .item-column-filter-row .has-filter input,.item-data-table .item-column-filter-row .has-filter select {border-color:#2a8661;background:#fafffc;padding-right:25px;}
0205 | .item-data-table .item-column-filter-row .item-filter-clear {position:absolute;right:3px;top:50%;transform:translateY(-50%);width:20px;min-width:20px;height:22px;padding:0;border:0;color:#355c49;border-radius:4px;background:#e4f1e8;cursor:pointer;}
0211 | .layout-conflict-resolver {border:1px solid #e7b58b;border-left:4px solid #b77b35;border-radius:9px;background:#fff9ed;padding:14px;margin:12px 0;display:grid;gap:10px;}
0212 | .layout-conflict-resolver > p {font-size:13px;line-height:1.5;margin:0;color:#654a32;}
0213 | .layout-conflict-field {margin:0;border:1px solid #e5d8c9;border-radius:8px;background:#fff;padding:10px 12px;min-width:0;}
0214 | .layout-conflict-field legend {font-weight:700;color:#344c3f;padding:0 4px;}
0215 | .layout-conflict-field > small {display:block;margin-bottom:8px;color:#5b6f63;}
0217 | .layout-conflict-options label {display:flex;align-items:flex-start;gap:9px;min-width:0;border:1px solid #dae6dd;border-radius:7px;padding:9px;cursor:pointer;background:#fafcfb;}
0218 | .layout-conflict-options label:has(input:checked) {border-color:#1c6c50;background:#e9f7ee;}
0282 | .item-data-table .item-column-filter-row input::placeholder {color:#9aa9a0;opacity:1;}
0284 |   background-image:none;
0294 |   outline:2px solid #89bba6;
0296 |   border-color:#4f8f74;
0299 | .item-data-table thead .item-column-filter-row th {box-shadow:0 1px 0 #c9dbd0;}
0317 |   border:1px solid #d6e5db;border-radius:8px;background:#eef6f1;
0330 |   border-right:1px solid #dfe9e2;
0333 |   box-shadow:inset -1px 0 #dfe9e2;
0337 |   border-right-color:#edf2ee;
0345 |   border:1px solid #dbe5de;
0346 |   border-radius:5px;
0347 |   background:transparent;
0349 |   color:#657f70;
0355 |   background:#e9f2eb;
0356 |   border-color:#9bbdac;
0364 | .column-manager .column-count {font-weight:400;font-size:12px;color:#6b8377;}
0371 |   align-items:center;gap:9px;padding:7px 9px;border:1px solid #e1e9e3;
0372 |   border-radius:8px;background:#fff;font-size:12px;min-width:0;
0374 | .column-manager-row.selected {background:#f6faf7;border-color:#b9d4c3;}
0377 | .column-manager-origin {font-size:11px;color:#7c9083;}
0378 | .column-manager-type {font-size:11px;color:#607567;}
0379 | .column-manager-detail {grid-column:1/-1;display:grid;grid-template-columns:minmax(160px,1fr) minmax(160px,1fr);gap:11px;border-top:1px solid #dce8df;padding:12px 4px 3px;}
0385 | .column-manager-removed,.column-manager-page-width {border:1px solid #e0e9e2;border-radius:8px;padding:9px 12px;}
0386 | .column-manager-removed summary,.column-manager-page-width summary {cursor:pointer;font-size:12px;color:#315a48;font-weight:650;}
0388 | .item-data-table .custom-cell-input {box-sizing:border-box;width:100%;min-height:30px;padding:5px 7px;border:1px solid #c4dbcd;border-radius:6px;background:white;font-size:12px;}
0404 | .column-manager>summary {position:relative;background:#f5f9f6;border-radius:10px;list-style:none;}
0406 | .column-manager>summary::before {content:"▸";color:#3b6e51;display:inline-block;transition:transform .15s ease;font-size:17px;}
0408 | .column-manager[open]>summary {border-radius:10px 10px 0 0;border-bottom:1px solid #d6e5da;background:#ebf4ed;}
0409 | .column-manager>summary:focus-visible {outline:2px solid #34795b;outline-offset:2px;}
0410 | .column-manager-catalog {grid-column:1/-1;display:grid;gap:7px;padding:10px 12px;border-radius:8px;border:1px solid #cddfd1;background:#f2f8f4;font-size:12px;color:#405e4c;}
0411 | .column-manager-catalog strong {font-size:13px;color:#285d41;}
0415 | .column-manager-savebar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 12px;background:#f3f8f4;border:1px solid #d7e7dc;border-radius:8px}
0416 | .column-manager-savebar strong{font-size:13px;color:#295844}
0418 | .column-manager-rights-warning{display:flex;gap:9px;align-items:flex-start;padding:10px;border:1px solid #ebcd99;border-radius:8px;background:#fffaf0;font-size:12px;color:#664c21}
0420 | .column-manager-legend{display:grid;grid-template-columns:26px minmax(160px,1fr) minmax(95px,125px) 62px 58px;gap:9px;padding:0 9px;color:#607c6a;font-size:11px;font-weight:650}
0423 | .column-manager-rights-hint{grid-column:1/-1;color:#627d6d;font-size:12px;margin:0}
0424 | .column-choice-editor{display:grid;gap:9px;border:1px solid #cfdfd4;background:#fff;padding:12px;border-radius:9px}
0430 | .column-choice-values li{display:flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid #e3ebe5;border-radius:7px;min-width:0}
0436 | .column-specialist-relations{grid-column:1/-1;border:1px solid #d5e5da;padding:10px 12px;border-radius:8px;background:#f9fcfa;font-size:12px}
0437 | .column-specialist-relations summary{font-weight:700;color:#325c46;cursor:pointer}
0445 | .column-manager-heading h3{margin:0;font-size:16px;color:var(--green)}
0446 | .column-manager-heading .column-count{font-size:12px;color:#62796b}
0447 | .column-manager-savebar{position:sticky;top:0;z-index:12;justify-content:space-between;background:#eaf4ee;border:1px solid #abcbb8;box-shadow:0 3px 9px #143f3214;padding:12px 14px}
0452 | .column-save-success{margin:0;color:#286142;font-size:12px;font-weight:650}
0460 | .item-data-region .item-sticky-search-controls{padding:0;background:transparent;box-shadow:none}
0474 | .app-shell.settings-page .item-list-card .column-manager {margin-bottom:7px;box-shadow:none;}
0558 |   font-size:12px;color:#5b7467;text-align:left;
0562 |   min-width:0;text-align:inherit;font-weight:700;color:#285c45;
0566 | .item-data-table .item-column-filter-row select.filter-placeholder {color:#9aa9a0;}
0567 | .item-data-table .item-column-filter-row select.selected-filter-value {color:#244d3e;}
0572 |   padding:5px 10px;min-height:28px;border:1px solid #85aa98;border-radius:7px;
0573 |   background:#edf7f0;color:#21583f;font-size:11px;font-weight:700;
0576 | .compact-columns-menu[open]>summary{background:#dcefe4;border-color:#377e5d}
0577 | .compact-columns-menu>summary:focus-visible{outline:2px solid #237f5c;outline-offset:2px}
0579 |   padding:0 3px;border-radius:10px;background:#226c4e;color:#fff;font-size:10px}
0582 |   border:1px solid #b7d3c3;border-radius:11px;background:#fff;
0583 |   box-shadow:0 12px 28px rgba(20,60,43,.16);color:#2b4939;text-align:left}
0586 |   padding:6px 3px;border-radius:5px;cursor:pointer;font-size:12px}
0587 | .compact-columns-options>label:hover{background:#f3f8f5}
0588 | .compact-columns-options input[type=checkbox]{margin-top:2px;accent-color:#287852;flex:none}
0590 | .compact-columns-options label small{font-size:11px;color:#6d8375;font-weight:400;line-height:1.35}
0592 |   border-top:1px solid #e3ece6;font-size:11px;color:#687e72;line-height:1.45}
0600 | .compact-type-suffix{display:inline-flex;align-items:center;white-space:nowrap;margin-left:4px;color:#58776a;font-size:11px;gap:0}
0606 | .compact-pair-tag{font-size:10px;font-weight:750;color:#688579;
0607 |   background:#edf3ef;border-radius:4px;padding:2px 4px;flex:none;min-width:34px;text-align:center}
0615 | .item-data-table thead .item-heading-row th {background:#edf4ef;}
0616 | .item-data-table thead .item-column-filter-row th {background:#f9fcfa;}
0625 | .item-data-table thead .item-heading-row th {background:#f6f9f7;}
0626 | .item-data-table thead .item-column-filter-row th {background:#fbfdfc;height:47px;}
0652 | .note-history-demo {margin-top:16px;padding-top:10px;border-top:1px solid #dce8e1;}
0654 | .note-history-demo-entry {border-left:3px solid #b9d4ed;padding:7px 11px;margin:8px 0;background:#f8fbff;}
0663 |   border:0;
0664 |   background:transparent;
0666 |   box-shadow:none;
0673 |   border:0;
0674 |   background:transparent;
0675 |   outline:none;
0679 |   width:2px;background:#348768;pointer-events:none;
0695 | .history-timestamp{display:block;color:#315EA8;font-size:12px;font-weight:650;margin:0 0 4px;}
0696 | .history-change-content{color:#263D32;font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;margin:0;}
0700 | .compact-type-suffix{font-size:.92em;font-weight:600;background:none;border:0}
0701 | .compact-type-suffix[data-kind='HC']{color:#3166A2}
0702 | .compact-type-suffix[data-kind='QPPL']{color:#9C4C2F}
0703 | .compact-type-suffix[data-kind='BC']{color:#4B7752}
0704 | .compact-type-suffix .compact-part,.compact-type-suffix .compact-part>span{color:inherit}
```

## `source/src/features/items/cell-picker.css`

Git blob SHA `77ffd16e006a7dfd62d3afef2095753c94d07bd2`; 17 relevant source lines / 70 total.

```text
0007 |   color: var(--ink);
0008 |   background: var(--surface);
0009 |   border: 1px solid var(--line);
0010 |   border-radius: 9px;
0011 |   box-shadow: var(--shadow);
0020 |   color: #42564e;
0028 |   color: var(--ink);
0029 |   background: var(--surface);
0030 |   border: 1px solid #cbd6cf;
0031 |   border-radius: 7px;
0038 |   color: var(--muted);
0051 |   color: var(--ink);
0052 |   background: transparent;
0053 |   border: 0;
0054 |   border-radius: 6px;
0062 |   background: var(--soft);
0067 |   outline: 2px solid var(--green);
```

## `source/src/data/status-palettes.ts`

Git blob SHA `a1cd2e8e7111f11ddd5d1d4f9768288b31462283`; 13 relevant source lines / 97 total.

```text
0005 | export type StatusSwatch={text:string;background:string};
0019 |   'not-submitted':{text:'#D00025',background:'#FFE0E4'},
0020 |   office:{text:'#B04700',background:'#FFE8B8'},
0021 |   done:{text:'#007A18',background:'#D5F0DE'},
0022 |   other:{text:'#426274',background:'#F2F6F9'},
0087 |     '--hdnd-status-not-submitted-text':colors['not-submitted'].text,
0088 |     '--hdnd-status-not-submitted-bg':colors['not-submitted'].background,
0089 |     '--hdnd-status-office-text':colors.office.text,
0090 |     '--hdnd-status-office-bg':colors.office.background,
0091 |     '--hdnd-status-done-text':colors.done.text,
0092 |     '--hdnd-status-done-bg':colors.done.background,
0093 |     '--hdnd-status-other-text':colors.other.text,
0094 |     '--hdnd-status-other-bg':colors.other.background,
```

## `source/src/data/report-preferences.ts`

Git blob SHA `e6bcbce447d80e6bc5a4d3b6a397fd34e0c6ca76`; 3 relevant source lines / 248 total.

```text
0188 |     const accentColor=row.titleAccentColor??'#b42318';
0192 |     const accentSettings=accentText.trim()?{titleAccentText:accentText.trim(),titleAccentColor:accentColor}:{};
0243 |     ...(row.titleAccentText?{titleAccentText:row.titleAccentText,titleAccentColor:row.titleAccentColor}:{}), hiddenColumns: [...row.hiddenColumns], columns: [...row.columnOrder], emphasizeProgress:row.emphasizeProgress!==false,
```

## `source/src/data/item-preferences.ts`

Git blob SHA `9aa8d06c2a751e39fffadc03afe25defa88db392`; 4 relevant source lines / 186 total.

```text
0010 |   id:string;word:string;field:string;textColor:string;backgroundColor:string;
0021 |   {color:string;backgroundColor:string}|undefined {
0028 |   return matched?{color:matched.textColor,backgroundColor:matched.backgroundColor}:undefined;
0146 |       textColor:rule.textColor,backgroundColor:rule.backgroundColor};
```

## `source/src/data/list-views.ts`

Git blob SHA `0d7f6c23ab3ef9d169054b4f0d72fd771e61bf7e`; 2 relevant source lines / 84 total.

```text
0011 |   id: string; field: string; value: string; color: 'mint'|'amber'|'rose'|'blue';
0035 |     return [{id:r.id.slice(0,90),field:r.field,value:r.value,color:r.color as ColorRule['color']}];
```

## `source/src/data/report-detail-presets.ts`

Git blob SHA `6ba381d5d356a544680f6588809aa03a09e3d7c0`; 0 relevant source lines / 49 total.

```text

```

## `source/src/features/items/StatusPaletteManager.tsx`

Git blob SHA `aa7180e0421b434ffe0562e73a1afd40fa8cba41`; 3 relevant source lines / 151 total.

```text
0038 |     }else setMessage('Nhập mã màu đầy đủ gồm dấu # và 6 ký tự HEX (ví dụ: #D00025).');
0117 |             <span className="status-palette-preview" style={{color:current[key].text,
0118 |               backgroundColor:current[key].background,
```

## `source/src/features/settings/ReportLayoutPanel.tsx`

Git blob SHA `d8c0a34bfbd4750ac0f3443dfea665cdae292900`; 2 relevant source lines / 183 total.

```text
0125 |                     value={report.titleAccentColor??'#b42318'}
0126 |                     onChange={event=>update(index,{titleAccentColor:event.currentTarget.value})}/>
```

## `source/src/app/App.tsx`

Git blob SHA `58ac707e8e58ef8e2156f1369e6db47839e79d43`; 0 relevant source lines / 411 total.

```text

```
