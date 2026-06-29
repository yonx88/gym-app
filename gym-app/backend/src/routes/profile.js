const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const user = db
    .prepare('SELECT id, email, height_cm, weight_kg, schedule_type, onboarded FROM users WHERE id = ?')
    .get(req.userId);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json(user);
});

router.put('/', (req, res) => {
  const { height_cm, weight_kg } = req.body;

  const updates = [];
  const params = [];
  if (height_cm !== undefined) {
    updates.push('height_cm = ?');
    params.push(height_cm);
  }
  if (weight_kg !== undefined) {
    updates.push('weight_kg = ?');
    params.push(weight_kg);
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });
  }

  params.push(req.userId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db
    .prepare('SELECT id, email, height_cm, weight_kg, schedule_type, onboarded FROM users WHERE id = ?')
    .get(req.userId);
  res.json(user);
});

module.exports = router;
