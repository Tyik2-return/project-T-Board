const express = require('express');
const router = express.Router();
const Logger = require('./modules/logger/logger');

const logger = new Logger();

// Получает все доски
router.get('/boards', (req, res) => {
  db.all('SELECT * FROM boards ORDER BY id DESC', (err, rows) => {
    if (err) {
      logger.error(err, { route: '/boards' });
      logger.trace('get_boards_failed', {
        route: '/boards',
        method: 'GET'
      });
      return res.status(500).json({ error: err.message });
    }

    logger.event('boards_fetched', {
      count: rows.length
    });

    res.json(rows);
  });
});

// Получает одну доску с деталями
router.get('/boards/:id', (req, res) => {
  const boardId = req.params.id;

  // Получаем информацию о доске
  db.get('SELECT title FROM boards WHERE id = ?', [boardId], (err, board) => {
    if (err || !board) {
      logger.error(err || new Error('Board not found'), { boardId });
      logger.trace('get_board_failed', {
        step: 'get_board',
        boardId
      });
      return res.status(404).json({ error: 'Board not found' });
    }

    // Получаем колонки доски
    db.all('SELECT * FROM column_rows WHERE board_id = ?', [boardId], (err, cr) => {
      if (err) {
        logger.error(err, { boardId });
        logger.trace('get_board_failed', {
          step: 'get_columns',
          boardId
        });
        return res.status(500).json({ error: err.message });
      }

      // Получаем задачи доски
      db.all('SELECT * FROM tasks WHERE board_id = ?', [boardId], (err, tasks) => {
        if (err) {
          logger.error(err, { boardId });
          logger.trace('get_board_failed', {
            step: 'get_tasks',
            boardId
          });
          return res.status(500).json({ error: err.message });
        }
        // Получаем теги задач
        db.all(
          'SELECT tt.task_id, t.id, t.name, t.color FROM task_tags tt JOIN tags t ON tt.tag_id = t.id',
          (err, links) => {
            if (err) {
              logger.error(err, { boardId });
              logger.trace('get_board_failed', {
                step: 'get_task_tags',
                boardId
              });
              return res.status(500).json({ error: err.message });
            }

            // Связываем теги с задачами
            const tagMap = {};
            links.forEach(l => {
              if (!tagMap[l.task_id]) tagMap[l.task_id] = [];
              tagMap[l.task_id].push({
                id: l.id,
                name: l.name,
                color: l.color
              });
            });

            tasks.forEach(t => {
              t.task_tags = tagMap[t.id] || [];
            });

            // Получаем теги доски
            db.all('SELECT * FROM tags WHERE board_id = ?', [boardId], (err, tags) => {
              if (err) {
                logger.error(err, { boardId });
                logger.trace('get_board_failed', {
                  step: 'get_tags',
                  boardId
                });
                return res.status(500).json({ error: err.message });
              }

              // Получаем подзадачи доски
              db.all(
                `SELECT s.*, t.board_id
                 FROM sub_tasks s
                 JOIN tasks t ON s.task_id = t.id
                 WHERE t.board_id = ?
                 ORDER BY s.position`,
                [boardId],
                (err, subTasks) => {
                  if (err) {
                    logger.error(err, { boardId });
                    logger.trace('get_board_failed', {
                      step: 'get_sub_tasks',
                      boardId
                    });
                    return res.status(500).json({ error: err.message });
                  }

                  // Связываем подзадачи с задачами
                  const subMap = {};
                  subTasks.forEach(s => {
                    if (!subMap[s.task_id]) subMap[s.task_id] = [];
                    subMap[s.task_id].push(s);
                  });

                  tasks.forEach(t => {
                    t.sub_tasks = subMap[t.id] || [];
                  });

                  logger.event('board_loaded', {
                    boardId,
                    columns: cr.length,
                    tasks: tasks.length,
                    tags: tags.length,
                    subTasks: subTasks.length
                  });

                  res.json({
                    title: board.title,
                    columns: cr.filter(c => c.type === 'column'),
                    tasks,
                    tags: tags || []
                  });
                }
              );
            });
          }
        );
      });
    });
  });
});

module.exports = router;
