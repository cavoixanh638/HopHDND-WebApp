import { readFile, readdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { gzipSync } from 'node:zlib';
import {spawnSync} from 'node:child_process';

const target = process.argv[2];
if (!['dist', 'dist-preact', 'dist-react','dist-pages','dist-pages-test'].includes(target)) throw new Error('Chỉ đóng gói thư mục build đã quy định.');
const pages=target.startsWith('dist-pages');
const directory = resolve(target);
if (relative(process.cwd(), directory) !== target) throw new Error('Đường dẫn build không hợp lệ.');
const input = resolve(directory, pages?'pages.html':'index.html');
let html = await readFile(input, 'utf8');
const consumed = new Set([input]);
async function asset(url) {
  if (/^(?:[a-z]+:|\/\/)/i.test(url)) throw new Error('Không ghép tài nguyên ngoài vào bản phát hành.');
  const path = resolve(directory, url.replace(/^\//, ''));
  const within = relative(directory, path);
  if (within.startsWith('..') || isAbsolute(within)) throw new Error('Tài nguyên nằm ngoài thư mục build.');
  consumed.add(path);
  return await readFile(path, 'utf8');
}
for (const match of [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/gi)]) {
  const javascript = (await asset(match[1])).replace(/<\/script/gi, '<\\/script');
  html = html.replace(match[0], () => `<script type="module">${javascript}</script>`);
}
for (const match of [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi)]) {
  const css = (await asset(match[1])).replace(/<\/style/gi, '<\\/style');
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
const markup = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>').replace(/(<style\b[^>]*>)[\s\S]*?<\/style>/gi, '$1</style>');
if (/<script\b[^>]*\bsrc\s*=/i.test(markup) || /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=/i.test(markup)) {
  throw new Error(`Bản phát hành còn phụ thuộc JS/CSS bên ngoài: ${markup.match(/<script\b[^>]*\bsrc\s*=[^>]*>|<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=[^>]*>/i)?.[0]?.slice(0, 160)}`);
}
const name = pages?'index.html':'Dashboard_HĐND.html';
for (const match of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/gi)) {
  // HTML executes this as type=module, not as a classic script. In particular
  // Vite's inlined lazy modules may legitimately reference import.meta.
  // Node --check parses ESM from stdin without executing browser code.
  const checked=spawnSync(process.execPath,['--input-type=module','--check'],
    {input:match[1],encoding:'utf8',maxBuffer:2*1024*1024});
  if(checked.status!==0)throw new Error(`Standalone module syntax invalid: ${checked.stderr?.split('\n').filter(line=>!line.startsWith('    at ')).slice(-4).join(' ').slice(0,600)}`);
}
await writeFile(resolve(directory, name), html, 'utf8');
for (const path of consumed) await unlink(path);
// Chỉ xóa thư mục assets nếu đã rỗng; không xóa đệ quy tài nguyên chưa nhận diện.
try { await rmdir(resolve(directory, 'assets')); } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY') throw error; }
const files = await readdir(directory);
if (files.length !== 1 || files[0] !== name) throw new Error(`Build không phải một file: ${files.join(', ')}`);
console.log(`${target}/${name}: ${Buffer.byteLength(html)} bytes; gzip ${gzipSync(html).byteLength} bytes. Một file độc lập.`);
