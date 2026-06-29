const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { category } = req.query;
  let rows;
  if (category) {
    rows = db.prepare('SELECT * FROM exercise_library WHERE category = ? ORDER BY id').all(category);
  } else {
    rows = db.prepare('SELECT * FROM exercise_library ORDER BY category, id').all();
  }
  res.json(rows);
});

module.exports = router;
