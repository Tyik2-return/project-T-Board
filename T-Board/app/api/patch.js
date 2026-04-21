const express = require('express');
const router = express.Router();
const Logger = require('./modules/logger/logger');

const logger = new Logger();

// Перемещает задачу между колонками
router.patch('/tasks/:id/move', (req, res) => {
  const taskId = req.params.id;
  const { column_id } = req.body;

  // Получаем статус колонки назначения
  db.get(
    'SELECT is_done_status FROM column_rows WHERE id = ?',
    [column_id],
    (err, col) => {
      // Логируем ошибку при получении колонки
      if (err || !col) {
        logger.error(err || new Error('Column not found'), {
          taskId,
          column_id
        });
        logger.trace('move_task_failed', {
          step: 'get_column_status',
          taskId,
          column_id
        });
        return res.status(500).json({ success: false });
      }

      const status = col.is_done_status ? 'done' : 'pending';
      // Обновляем задачу
      db.run(
        'UPDATE tasks SET column_id=?, status=? WHERE id=?',
        [column_id, status, taskId],
        function (err) {
          if (err) {
            logger.error(err, { taskId, column_id, status });
            logger.trace('move_task_failed', {
              step: 'update_task',
              taskId
            });
            return res.status(500).json({ success: false });
          }

          logger.event('task_moved', {
            taskId,
            column_id,
            status
          });

          res.json({ success: true });
        }
      );
    }
  );
});

// Обрабатывает завершение подзадачи
router.patch('/subtasks/:id/complete', (req, res) => {
  const subtaskId = req.params.id;
  const { completed } = req.body;
  // Получаем task_id для логирования
  db.get(
    'SELECT task_id FROM sub_tasks WHERE id=?',
    [subtaskId],
    (err, row) => {
      // Логируем ошибку при получении task_id
      if (err || !row) {
        logger.error(err || new Error('Subtask not found'), {
          subtaskId
        });
        logger.trace('complete_subtask_failed', {
          step: 'get_task_id',
          subtaskId
        });
        return res.status(500).json({ success: false });
      }
      // Обновляем подзадачу
      db.run(
        'UPDATE sub_tasks SET completed=? WHERE id=?',
        [completed ? 1 : 0, subtaskId],
        function (err) {
          // Логируем ошибку при обновлении подзадачи
          if (err) {
            logger.error(err, { subtaskId, completed });
            logger.trace('complete_subtask_failed', {
              step: 'update_subtask',
              subtaskId
            });
            return res.status(500).json({ success: false });
          }

          logger.event('subtask_completed_changed', {
            subtaskId,
            completed: !!completed
          });

          res.json({ success: true });
        }
      );
    }
  );
});

// Обновляет заголовок подзадачи
router.patch('/subtasks/:id', (req, res) => {
  const subtaskId = req.params.id;
  const { title } = req.body;
  // Проверяем наличие заголовка
  if (!title) {
    return res.status(400).json({ error: 'title required' });
  }
  // Получаем task_id для логирования
  db.get(
    'SELECT task_id FROM sub_tasks WHERE id=?',
    [subtaskId],
    (err, row) => {
      // Логируем ошибку при получении task_id
      if (err || !row) {
        logger.error(err || new Error('Subtask not found'), {
          subtaskId
        });
        logger.trace('update_subtask_failed', {
          step: 'get_task_id',
          subtaskId
        });
        return res.status(500).json({ success: false });
      }
      
      // Обновляем заголовок подзадачи
      db.run(
        'UPDATE sub_tasks SET title=? WHERE id=?',
        [title, subtaskId],
        function (err) {
          if (err) {
            logger.error(err, { subtaskId, title });
            logger.trace('update_subtask_failed', {
              step: 'update_title',
              subtaskId
            });
            return res.status(500).json({ success: false });
          }

          logger.event('subtask_title_updated', {
            subtaskId
          });

          res.json({ success: true });
        }
      );
    }
  );
});

module.exports = router;
