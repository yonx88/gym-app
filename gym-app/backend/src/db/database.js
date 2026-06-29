// طبقة قاعدة البيانات — تستخدم SQLite المدمج في Node.js (node:sqlite)
// لا تحتاج أي تجميع أو تنصيب — متوفرة في Node 22.5 وأحدث.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// مكان حفظ قاعدة البيانات. على الاستضافة نخليه داخل القرص الدائم (Volume)
// عن طريق متغيّر البيئة DATA_DIR، وإلا يستخدم مجلد محلي أثناء التطوير.
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'gym.db'));

// طبقة توافق بسيطة عشان باقي الكود يشتغل بنفس واجهة better-sqlite3
db.pragma = (statement) => db.exec('PRAGMA ' + statement);
db.transaction = (fn) => (...args) => {
  db.exec('BEGIN');
  try {
    const result = fn(...args);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  height_cm REAL,
  weight_kg REAL,
  schedule_type TEXT DEFAULT 'custom', -- ppl | upper_lower | bro_split | custom
  onboarded INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedule_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Sunday ... 6=Saturday
  is_gym_day INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL DEFAULT 'راحة', -- e.g. سحب / دفع / أرجل / كارديو / راحة
  has_cardio INTEGER DEFAULT 0,
  cardio_machine TEXT,
  cardio_minutes INTEGER,
  UNIQUE(user_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  schedule_day_id INTEGER NOT NULL REFERENCES schedule_days(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps INTEGER NOT NULL DEFAULT 10,
  image_path TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date TEXT NOT NULL, -- YYYY-MM-DD
  weight_kg REAL,
  sets_done INTEGER,
  reps_done INTEGER,
  is_checked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(exercise_id, log_date)
);

CREATE TABLE IF NOT EXISTS day_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_date TEXT NOT NULL, -- YYYY-MM-DD
  schedule_day_id INTEGER,
  calories_estimate REAL DEFAULT 0,
  completed_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, day_date)
);

CREATE TABLE IF NOT EXISTS exercise_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL -- دفع | سحب | أرجل | صدر | ظهر | أكتاف | أذرع | كارديو
);
`);

const libCount = db.prepare('SELECT COUNT(*) AS c FROM exercise_library').get().c;
if (libCount === 0) {
  const insert = db.prepare('INSERT INTO exercise_library (name, category) VALUES (?, ?)');
  const seedExercises = [
    ['بنش بريس بار', 'دفع'], ['بنش دمبل مائل', 'دفع'], ['ضغط أكتاف بار', 'دفع'],
    ['تفتيح جانبي دمبل', 'دفع'], ['ترايسبس كيبل', 'دفع'], ['ديبس', 'دفع'],
    ['عقلة', 'سحب'], ['سحب أرضي (لات بول داون)', 'سحب'], ['تجديف بار', 'سحب'],
    ['سحب كيبل من الجلوس', 'سحب'], ['باي سبس بار', 'سحب'], ['باي سبس دمبل', 'سحب'],
    ['سكوات', 'أرجل'], ['ديدليفت رومانية', 'أرجل'], ['ضغط رجل (ليج بريس)', 'أرجل'],
    ['اكستنشن رجل', 'أرجل'], ['كيرل رجل', 'أرجل'], ['نطر سمانة', 'أرجل'],
    ['بنش بار مسطح', 'صدر'], ['فلاي كيبل', 'صدر'], ['بكدور مكينة', 'صدر'],
    ['ديدليفت كامل', 'ظهر'], ['تجديف دمبل بيد واحدة', 'ظهر'], ['سحب خلفي للأكتاف', 'ظهر'],
    ['ضغط عسكري', 'أكتاف'], ['تفتيح خلفي', 'أكتاف'], ['شراج (رفرفة)', 'أكتاف'],
    ['باي سبس هامر', 'أذرع'], ['ترايسبس فوق الرأس', 'أذرع'], ['كيرل كيبل', 'أذرع'],
    ['مشاية', 'كارديو'], ['دراجة ثابتة', 'كارديو'], ['إليبتيكال', 'كارديو'],
    ['مدرج (Stairmaster)', 'كارديو'], ['حبل نطر', 'كارديو'],
  ];
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insert.run(r[0], r[1]);
  });
  insertMany(seedExercises);
}

module.exports = db;
