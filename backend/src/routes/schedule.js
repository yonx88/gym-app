const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const TEMPLATE_CYCLES = {
  ppl: ['دفع', 'سحب', 'أرجل'],
  upper_lower: ['علوي', 'سفلي'],
  bro_split: ['صدر', 'ظهر', 'أرجل', 'أكتاف', 'أذرع'],
};

// labels that map to one or more library categories, used to auto-fill exercises
const LABEL_CATEGORY_MAP = {
  'دفع': ['دفع'],
  'سحب': ['سحب'],
  'أرجل': ['أرجل'],
  'صدر': ['صدر'],
  'ظهر': ['ظهر'],
  'أكتاف': ['أكتاف'],
  'أذرع': ['أذرع'],
  'علوي': ['صدر', 'ظهر', 'أكتاف', 'أذرع'],
  'سفلي': ['أرجل'],
};

function getDefaultExercises(label, limit = 5) {
  const categories = LABEL_CATEGORY_MAP[label] || [];
  if (categories.length === 0) return [];
  const placeholders = categories.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT name FROM exercise_library WHERE category IN (${placeholders}) ORDER BY id LIMIT ?`)
    .all(...categories, limit);
  return rows.map((r) => r.name);
}

function getFullSchedule(userId) {
  const days = db
    .prepare('SELECT * FROM schedule_days WHERE user_id = ? ORDER BY day_of_week')
    .all(userId);

  const dayMap = {};
  for (let dow = 0; dow < 7; dow++) {
    dayMap[dow] = {
      day_of_week: dow,
      day_name: DAY_NAMES[dow],
      is_gym_day: false,
      label: 'راحة',
      has_cardio: false,
      cardio_machine: null,
      cardio_minutes: null,
      exercises: [],
    };
  }

  for (const d of days) {
    const exercises = db
      .prepare('SELECT * FROM exercises WHERE schedule_day_id = ? ORDER BY order_index, id')
      .all(d.id);
    dayMap[d.day_of_week] = {
      id: d.id,
      day_of_week: d.day_of_week,
      day_name: DAY_NAMES[d.day_of_week],
      is_gym_day: !!d.is_gym_day,
      label: d.label,
      has_cardio: !!d.has_cardio,
      cardio_machine: d.cardio_machine,
      cardio_minutes: d.cardio_minutes,
      exercises,
    };
  }

  return Object.values(dayMap);
}

router.get('/', (req, res) => {
  res.json({ days: getFullSchedule(req.userId) });
});

// Apply a ready-made template (PPL / Upper-Lower / Bro split) over chosen gym days
router.post('/template', (req, res) => {
  const { gymDays, scheduleType } = req.body;

  if (!Array.isArray(gymDays) || gymDays.length === 0) {
    return res.status(400).json({ error: 'اختر أيام النادي أولاً' });
  }
  const cycle = TEMPLATE_CYCLES[scheduleType];
  if (!cycle) {
    return res.status(400).json({ error: 'نوع جدول غير معروف' });
  }

  const sortedDays = [...gymDays].sort((a, b) => a - b);

  const upsertDay = db.prepare(`
    INSERT INTO schedule_days (user_id, day_of_week, is_gym_day, label)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(user_id, day_of_week) DO UPDATE SET is_gym_day = 1, label = excluded.label
  `);
  const clearRestDay = db.prepare(`
    INSERT INTO schedule_days (user_id, day_of_week, is_gym_day, label)
    VALUES (?, ?, 0, 'راحة')
    ON CONFLICT(user_id, day_of_week) DO UPDATE SET is_gym_day = 0, label = 'راحة'
  `);
  const deleteExercisesForDay = db.prepare('DELETE FROM exercises WHERE schedule_day_id = ?');
  const getDayId = db.prepare('SELECT id FROM schedule_days WHERE user_id = ? AND day_of_week = ?');
  const insertExercise = db.prepare(`
    INSERT INTO exercises (user_id, schedule_day_id, name, target_sets, target_reps, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (let dow = 0; dow < 7; dow++) {
      if (!sortedDays.includes(dow)) {
        clearRestDay.run(req.userId, dow);
      }
    }
    sortedDays.forEach((dow, idx) => {
      const label = cycle[idx % cycle.length];
      upsertDay.run(req.userId, dow, label);
      const dayRow = getDayId.get(req.userId, dow);
      deleteExercisesForDay.run(dayRow.id);
      const defaults = getDefaultExercises(label);
      defaults.forEach((name, i) => {
        insertExercise.run(req.userId, dayRow.id, name, 3, 10, i);
      });
    });
    db.prepare('UPDATE users SET schedule_type = ?, onboarded = 1 WHERE id = ?').run(scheduleType, req.userId);
  });
  tx();

  res.json({ days: getFullSchedule(req.userId) });
});

// Create/update a single day (used by the custom schedule builder)
router.put('/day/:dayOfWeek', (req, res) => {
  const dayOfWeek = Number(req.params.dayOfWeek);
  const { is_gym_day, label, has_cardio, cardio_machine, cardio_minutes } = req.body;

  if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ error: 'يوم غير صحيح' });
  }

  db.prepare(`
    INSERT INTO schedule_days (user_id, day_of_week, is_gym_day, label, has_cardio, cardio_machine, cardio_minutes)
    VALUES (@user_id, @day_of_week, @is_gym_day, @label, @has_cardio, @cardio_machine, @cardio_minutes)
    ON CONFLICT(user_id, day_of_week) DO UPDATE SET
      is_gym_day = @is_gym_day, label = @label, has_cardio = @has_cardio,
      cardio_machine = @cardio_machine, cardio_minutes = @cardio_minutes
  `).run({
    user_id: req.userId,
    day_of_week: dayOfWeek,
    is_gym_day: is_gym_day ? 1 : 0,
    label: label || 'راحة',
    has_cardio: has_cardio ? 1 : 0,
    cardio_machine: cardio_machine || null,
    cardio_minutes: cardio_minutes || null,
  });

  db.prepare("UPDATE users SET schedule_type = 'custom', onboarded = 1 WHERE id = ?").run(req.userId);

  res.json({ days: getFullSchedule(req.userId) });
});

// Add an exercise to a specific day (custom builder)
router.post('/day/:dayOfWeek/exercises', (req, res) => {
  const dayOfWeek = Number(req.params.dayOfWeek);
  const { name, target_sets, target_reps } = req.body;

  if (!name) return res.status(400).json({ error: 'اسم التمرين مطلوب' });

  const dayRow = db
    .prepare('SELECT id FROM schedule_days WHERE user_id = ? AND day_of_week = ?')
    .get(req.userId, dayOfWeek);
  if (!dayRow) return res.status(404).json({ error: 'اليوم غير موجود، حدد اليوم أولاً' });

  const countRow = db
    .prepare('SELECT COUNT(*) AS c FROM exercises WHERE schedule_day_id = ?')
    .get(dayRow.id);

  const result = db.prepare(`
    INSERT INTO exercises (user_id, schedule_day_id, name, target_sets, target_reps, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.userId, dayRow.id, name, target_sets || 3, target_reps || 10, countRow.c);

  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(exercise);
});

router.put('/exercises/:id', (req, res) => {
  const { name, target_sets, target_reps } = req.body;
  const exercise = db
    .prepare('SELECT * FROM exercises WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!exercise) return res.status(404).json({ error: 'التمرين غير موجود' });

  db.prepare('UPDATE exercises SET name = ?, target_sets = ?, target_reps = ? WHERE id = ?').run(
    name ?? exercise.name,
    target_sets ?? exercise.target_sets,
    target_reps ?? exercise.target_reps,
    exercise.id
  );
  res.json(db.prepare('SELECT * FROM exercises WHERE id = ?').get(exercise.id));
});

router.delete('/exercises/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM exercises WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'التمرين غير موجود' });
  res.json({ ok: true });
});

module.exports = router;
