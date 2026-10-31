import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const app=readFileSync(fileURLToPath(new URL('../src/app/App.tsx',import.meta.url)),'utf8');

describe('PR95 read-only guest notice regression',()=>{
  it('removes only the no-editable-cell sentence and its empty banner',()=>{
    expect(app).not.toContain('Không có ô nào được cấp quyền sửa trong phần dữ liệu đang xem.');
    expect(app).toContain(':!viewerMayEdit?null');
    expect(app).toContain('{guestRightsNotice&&<p className="guest-rights-hint"');
  });
  it('retains actual connection, freeze, authorization and error guards',()=>{
    expect(app).toContain('Chưa kết nối Firebase; tạm thời chỉ xem, chưa thể lưu thay đổi.');
    expect(app).toContain('Quản trị đang tạm khóa chỉnh sửa.');
    expect(app).toContain('Dữ liệu đang được chốt hoặc tạm khóa; chưa thể mở lượt sửa mới.');
    expect(app).toContain('Tài khoản Google này chưa được duyệt quyền UID chỉnh sửa.');
    expect(app).toContain('Firebase đang phản hồi chậm.');
    expect(app).toContain('Không tải được danh mục và cách hiển thị:');
  });
});
