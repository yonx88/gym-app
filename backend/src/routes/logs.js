const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(authMiddleware);

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getDayOfWeekRow(userId, dow) {
  return db.prepare('SELECT * FROM schedule_days WHERE user_id = ? AND day_of_week = ?').get(userId, dow);
}

function lastLogBefore(exerciseId, beforeDate) {
  return db
    .prepare('SELECT * FROM exercise_logs WHERE exercise_id = ? AND log_date < ? ORDER BY log_date DESC LIMIT 1')
    .get(exerciseId, beforeDate);
}

// Today's workout: day info + exercises with last-known weight/reps + today's progress
router.get('/today', (req, res) => {
  const now = new Date();
  const dow = now.getDay();
  const date = todayStr();

  const dayRow = getDayOfWeekRow(req.userId, dow);
  const dayCompletion = db
    .prepare('SELECT * FROM day_completions WHERE user_id = ? AND day_date = ?')
    .get(req.userId, date);

  if (!dayRow || !dayRow.is_gym_day) {
    return res.json({
      date,
      day_name: DAY_NAMES[dow],
      is_gym_day: false,
      label: 'راحة',
      exercises: [],
      is_completed: !!dayCompletion,
      calories_today: dayCompletion ? dayCompletion.calories_estimate : 0,
    });
  }

  const exercises = db
    .prepare('SELECT * FROM exercises WHERE schedule_day_id = ? ORDER BY order_index, id')
    .all(dayRow.id);

  const exercisesWithLogs = exercises.map((ex) => {
    const todayLog = db
      .prepare('SELECT * FROM exercise_logs WHERE exercise_id = ? AND log_date = ?')
      .get(ex.id, date);
    const lastLog = lastLogBefore(ex.id, date);
    return {
      ...ex,
      today_log: todayLog || null,
      last_log: lastLog || null,
    };
  });

  res.json({
    date,
    day_name: DAY_NAMES[dow],
    is_gym_day: true,
    label: dayRow.label,
    has_cardio: !!dayRow.has_cardio,
    cardio_machine: dayRow.cardio_machine,
    cardio_minutes: dayRow.cardio_minutes,
    exercises: exercisesWithLogs,
    is_completed: !!dayCompletion,
    calories_today: dayCompletion ? dayCompletion.calories_estimate : 0,
  });
});

// Save / update a log entry for one exercise, today
router.post('/exercise', (req, res) => {
  const { exercise_id, weight_kg, sets_done, reps_done, is_checked } = req.body;
  const date = todayStr();

  const exercise = db
    .prepare('SELECT * FROM exercises WHERE id = ? AND user_id = ?')
    .get(exercise_id, req.userId);
  if (!exercise) return res.status(404).json({ error: 'التمرين غير موجود' });

  db.prepare(`
    INSERT INTO exercise_logs (exercise_id, user_id, log_date, weight_kg, sets_done, reps_done, is_checked)
    VALUES (@exercise_id, @user_id, @log_date, @weight_kg, @sets_done, @reps_done, @is_checked)
    ON CONFLICT(exercise_id, log_date) DO UPDATE SET
      weight_kg = @weight_kg, sets_done = @sets_done, reps_done = @reps_done, is_checked = @is_checked
  `).run({
    exercise_id,
    user_id: req.userId,
    log_date: date,
    weight_kg: weight_kg ?? null,
    sets_done: sets_done ?? exercise.target_sets,
    reps_done: reps_done ?? exercise.target_reps,
    is_checked: is_checked ? 1 : 0,
  });

  const log = db
    .prepare('SELECT * FROM exercise_logs WHERE exercise_id = ? AND log_date = ?')
    .get(exercise_id, date);
  res.json(log);
});

// Upload/replace a photo for an exercise
router.post('/exercise/:id/image', upload.single('image'), (req, res) => {
  const exercise = db
    .prepare('SELECT * FROM exercises WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!exercise) return res.status(404).json({ error: 'التمرين غير موجود' });
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع صورة' });

  const imagePath = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE exercises SET image_path = ? WHERE id = ?').run(imagePath, exercise.id);
  res.json({ image_path: imagePath });
});

// Mark today's workout day as finished, with a rough calorie estimate
router.post('/day-complete', (req, res) => {
  const date = todayStr();
  const now = new Date();
  const dow = now.getDay();
  const dayRow = getDayOfWeekRow(req.userId, dow);
  const user = db.prepare('SELECT weight_kg FROM users WHERE id = ?').get(req.userId);
  const weight = user.weight_kg || 70;

  let strengthKcal = 0;
  if (dayRow) {
    const checked = db
      .prepare(`
        SELECT l.* FROM exercise_logs l
        JOIN exercises e ON e.id = l.exercise_id
        WHERE e.schedule_day_id = ? AND l.log_date = ? AND l.is_checked = 1
      `)
      .all(dayRow.id, date);
    strengthKcal = checked.reduce((sum, log) => sum + (log.sets_done || 3) * 6, 0);
  }

  let cardioKcal = 0;
  if (dayRow && dayRow.has_cardio && dayRow.cardio_minutes) {
    cardioKcal = dayRow.cardio_minutes * 8 * (weight / 70);
  }

  const calories = Math.round(strengthKcal + cardioKcal);

  db.prepare(`
    INSERT INTO day_completions (user_id, day_date, schedule_day_id, calories_estimate)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, day_date) DO UPDATE SET calories_estimate = ?
  `).run(req.userId, date, dayRow ? dayRow.id : null, calories, calories);

  res.json({ date, calories_estimate: calories, is_completed: true });
});

// Undo finishing the day
router.delete('/day-complete', (req, res) => {
  const date = todayStr();
  db.prepare('DELETE FROM day_completions WHERE user_id = ? AND day_date = ?').run(req.userId, date);
  res.json({ ok: true });
});

// Weekly attendance / timesheet. ?weeksAgo=0 (هذا الأسبوع) أو 1,2,3... للأسابيع السابقة
router.get('/week', (req, res) => {
  const weeksAgo = Math.max(0, parseInt(req.query.weeksAgo, 10) || 0);
  const now = new Date();
  const todayDate = todayStr();

  // أحد الأسبوع المطلوب
  const ref = new Date(now);
  ref.setDate(now.getDate() - weeksAgo * 7);
  const refDow = ref.getDay();
  const sunday = new Date(ref);
  sunday.setDate(ref.getDate() - refDow);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const dayRow = getDayOfWeekRow(req.userId, i);
    const completion = db
      .prepare('SELECT * FROM day_completions WHERE user_id = ? AND day_date = ?')
      .get(req.userId, dateStr);

    const isFuture = dateStr > todayDate;

    week.push({
      date: dateStr,
      day_of_week: i,
      day_name: DAY_NAMES[i],
      is_gym_day: dayRow ? !!dayRow.is_gym_day : false,
      label: dayRow ? dayRow.label : 'راحة',
      attended: !!completion,
      calories: completion ? completion.calories_estimate : 0,
      is_future: isFuture,
      is_today: dateStr === todayDate,
    });
  }

  const gymDaysCount = week.filter((d) => d.is_gym_day).length;
  const attendedCount = week.filter((d) => d.attended).length;
  const startStr = week[0].date;
  const endStr = week[6].date;

  res.json({
    week,
    gym_days_count: gymDaysCount,
    attended_count: attendedCount,
    weeks_ago: weeksAgo,
    week_start: startStr,
    week_end: endStr,
    is_current_week: weeksAgo === 0,
  });
});

// إحصائيات + بيانات التقويم السنوي (للمربعات الملوّنة)
router.get('/stats', (req, res) => {
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const currentMonthPrefix = todayStr().slice(0, 7); // YYYY-MM

  const completions = db
    .prepare('SELECT day_date, calories_estimate FROM day_completions WHERE user_id = ? ORDER BY day_date')
    .all(req.userId);

  let monthCount = 0;
  let yearCount = 0;
  const days = {}; // date -> calories (لكل يوم حضرته في السنة المطلوبة)
  const yearsSet = new Set();

  for (const c of completions) {
    const y = c.day_date.slice(0, 4);
    yearsSet.add(Number(y));
    if (c.day_date.slice(0, 7) === currentMonthPrefix) monthCount++;
    if (Number(y) === year) {
      yearCount++;
      days[c.day_date] = c.calories_estimate || 0;
    }
  }

  yearsSet.add(now.getFullYear());
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  res.json({
    year,
    years,
    month_count: monthCount,
    year_count: yearCount,
    total_count: completions.length,
    days,
  });
});

module.exports = router;
