require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const scheduleRoutes = require('./routes/schedule');
const logsRoutes = require('./routes/logs');
const libraryRoutes = require('./routes/library');

const app = express();
const PORT = process.env.PORT || 3000;

// مجلد الصور (نفس المجلد اللي يحفظ فيه multer)
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/library', libraryRoutes);

// ===== تقديم واجهة Angular (إن وُجدت بعد البناء) =====
// أثناء النشر تُنسخ ملفات الواجهة إلى backend/public، فيصير كل شي على رابط واحد.
const clientDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(path.join(clientDir, 'index.html'))) {
  app.use(express.static(clientDir));
  // أي مسار غير /api و /uploads نرجّع له index.html (توجيه Angular)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

// معالج الأخطاء العام (مثل أخطاء نوع الملف في الرفع)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'حدث خطأ في السيرفر' });
});

app.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل على المنفذ ${PORT}`);
});
