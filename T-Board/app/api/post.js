const express = require('express');
const router = express.Router();
const Logger = require('./modules/logger/logger');

const logger = new Logger();

// Создает новую доску
router.post('/boards', (req, res) => {
  const { title = 'Новая доска' } = req.body;

  // Вставляем доску в БД
  db.run('INSERT INTO boards (title) VALUES (?)', [title], function (err) {
    if (err) {
      logger.error(err, { title });
      logger.trace('create_board_failed', { step: 'insert_board', title });
      return res.status(500).json({ success: false });
    }

    const boardId = this.lastID;
    const cols = [
      ['To Do', 0],
      ['In Progress', 0],
      ['Done', 1]
    ];

    // Вставляем стандартные колонки/ряды
    const stmt = db.prepare(
      'INSERT INTO column_rows (board_id,title,type,is_done_status,position) VALUES (?,?,?,?,?)'
    );

    cols.forEach((c, i) => stmt.run(boardId, c[0], 'column', c[1], i));
    stmt.run(boardId, 'Основной ряд', 'row', 0, 0);

    stmt.finalize(err => {
      if (err) {
        logger.error(err, { boardId });
        logger.trace('create_board_failed', { step: 'insert_columns', boardId });
        return res.status(500).json({ success: false });
      }

      logger.event('board_created', {
        boardId,
        title
      });

      broadcast(boardId, 'board.created', { id: boardId, title });
      res.json({ id: boardId, title });
    });
  });
});

// Создает новую задачу
router.post('/tasks', (req, res) => {
  const { board_id, column_id, title } = req.body;
  
  db.run(
    'INSERT INTO tasks (board_id, column_id, title) VALUES (?,?,?)',
    [board_id, column_id, title],
    function (err) {
      if (err) {
        logger.error(err, { board_id, column_id, title });
        logger.trace('create_task_failed', {
          step: 'insert_task',
          board_id
        });
        return res.status(500).json({ success: false });
      }

      const task = {
        id: this.lastID,
        title,
        column_id
      };

      logger.event('task_created', {
        taskId: task.id,
        board_id,
        column_id
      });

      broadcast(board_id, 'task.created', task);
      res.json(task);
    }
  );
});

// Создает новую подзадачу
router.post('/subtasks', (req, res) => {
  const { task_id, title } = req.body;

  db.run(
    `INSERT INTO sub_tasks (task_id, title, position)
     VALUES (?, ?, (SELECT IFNULL(MAX(position),0)+1 FROM sub_tasks WHERE task_id=?))`,
    [task_id, title, task_id],
    function (err) {
      if (err) {
        logger.error(err, { task_id, title });
        logger.trace('create_subtask_failed', {
          step: 'insert_subtask',
          task_id
        });
        return res.status(500).json({ success: false });
      }

      const subtask = {
        id: this.lastID,
        title,
        completed: 0
      };
      // Получаем board_id для логирования
      db.get('SELECT board_id FROM tasks WHERE id=?', [task_id], (err, row) => {
        if (err) {
          logger.error(err, { task_id });
          logger.trace('create_subtask_failed', {
            step: 'get_board_id',
            task_id
          });
          return res.status(500).json({ success: false });
        }

        logger.event('subtask_created', {
          subtaskId: subtask.id,
          task_id
        });

        if (row) {
          broadcast(row.board_id, 'subtask.created', {
            task_id,
            subTask: subtask
          });
        }

        res.json(subtask);
      });
    }
  );
});

// Создает новый тег
router.post('/tags', (req, res) => {
  const { board_id, name, color = '#3B82F6' } = req.body;

  db.run(
    'INSERT INTO tags (board_id, name, color) VALUES (?,?,?)',
    [board_id, name, color],
    function (err) {
      if (err) {
        logger.error(err, { board_id, name, color });
        logger.trace('create_tag_failed', {
          step: 'insert_tag',
          board_id
        });
        return res.status(500).json({ success: false });
      }

      const tag = {
        id: this.lastID,
        name,
        color
      };

      logger.event('tag_created', {
        tagId: tag.id,
        board_id
      });

      broadcast(board_id, 'tag.created', tag);
      res.json(tag);
    }
  );
});

// Добавляет связь задачи с тегом
router.post('/task-tags', (req, res) => {
  const { task_id, tag_id } = req.body;

  db.run(
    'INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?,?)',
    [task_id, tag_id],
    err => {
      if (err) {
        logger.error(err, { task_id, tag_id });
        logger.trace('add_task_tag_failed', {
          step: 'insert_task_tag',
          task_id
        });
        return res.status(500).json({ success: false });
      }
      // Получаем board_id для логирования
      db.get('SELECT board_id FROM tasks WHERE id=?', [task_id], (err, row) => {
        if (err) {
          logger.error(err, { task_id });
          logger.trace('add_task_tag_failed', {
            step: 'get_board_id',
            task_id
          });
          return res.status(500).json({ success: false });
        }

        logger.event('task_tag_added', {
          task_id,
          tag_id
        });

        if (row) {
          broadcast(row.board_id, 'task.tag.added', { task_id, tag_id });
        }

        res.json({ success: true });
      });
    }
  );
});

module.exports = router;
