const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// مكان حفظ صور التمارين. على الاستضافة نخليه داخل القرص الدائم (Volume)
// عن طريق متغيّر البيئة UPLOADS_DIR، وإلا يستخدم مجلد محلي أثناء التطوير.
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('يجب أن يكون الملف صورة'));
    }
    cb(null, true);
  },
});

module.exports = upload;
