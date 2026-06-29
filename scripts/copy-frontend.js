// ينسخ ملفات واجهة Angular المبنية إلى backend/public ليقدّمها السيرفر على نفس الرابط.
const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '..', 'frontend', 'dist', 'frontend', 'browser'),
  path.join(__dirname, '..', 'frontend', 'dist', 'frontend'),
];
const src = candidates.find((p) => fs.existsSync(path.join(p, 'index.html')));
if (!src) {
  console.error('❌ ما لقيت ملفات الواجهة المبنية. شغّل بناء الواجهة أول.');
  process.exit(1);
}

const dest = path.join(__dirname, '..', 'backend', 'public');
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`✅ نُسخت الواجهة من ${path.relative(process.cwd(), src)} إلى backend/public`);
