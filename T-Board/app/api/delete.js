const express = require('express');
const router = express.Router();
const Logger = require('./modules/logger/logger');

const logger = new Logger();

// Удаляет доску
router.delete('/boards/:id', (req, res) => {
  const boardId = req.params.id;
  // Сначала удаляем связанные колонки и задачи
  db.run('DELETE FROM boards WHERE id = ?', [boardId], function (err) {
    // Если ошибка, логируем (как ошибку и trace) и возвращаем ошибку
    if (err) {
      logger.error(err, { boardId });
      logger.trace('delete_board_failed', {
        boardId,
        route: '/boards/:id',
        method: 'DELETE'
      });
      return res.status(500).json({ success: false });
    }
    
    // Логируем успешное удаление доски
    logger.event('board_deleted', {
      boardId,
      affectedRows: this.changes
    });

    res.json({ success: true });
  });
});

// Удаляет задачу
router.delete('/tasks/:id', (req, res) => {
  const taskId = req.params.id;
  // Сначала удаляем связанные подзадачи
  db.run('DELETE FROM sub_tasks WHERE task_id = ?', [taskId], err => {
    if (err) {
      logger.error(err, { taskId });
      logger.trace('delete_task_failed_step', {
        step: 'delete_sub_tasks',
        taskId
      });
      return res.status(500).json({ success: false });
    }

    // Затем удаляем саму задачу (мб сделать каскадное удаление в БД?)
    db.run('DELETE FROM tasks WHERE id = ?', [taskId], function (err) {
      if (err) {
        logger.error(err, { taskId });
        logger.trace('delete_task_failed_step', {
          step: 'delete_task',
          taskId
        });
        return res.status(500).json({ success: false });
      }

      // Логируем успешное удаление задачи
      logger.event('task_deleted', {
        taskId,
        affectedRows: this.changes
      });

      res.json({ success: true });
    });
  });
});

// Удаляет подзадачу
router.delete('/subtasks/:id', (req, res) => {
  const subtaskId = req.params.id;

  // Сначала получаем task_id для логирования
  db.get(
    'SELECT task_id FROM sub_tasks WHERE id = ?',
    [subtaskId],
    (err, row) => {
      // Логируем ошибку при получении task_id
      if (err) {
        logger.error(err, { subtaskId });
        logger.trace('delete_subtask_failed', {
          step: 'select_task_id',
          subtaskId
        });
        return res.status(500).json({ success: false });
      }

      // Затем удаляем подзадачу (мб сделать каскадное удаление в БД?)
      db.run('DELETE FROM sub_tasks WHERE id = ?', [subtaskId], function (err) {
        // Логируем ошибку при удалении подзадачи
        if (err) {
          logger.error(err, { subtaskId });
          logger.trace('delete_subtask_failed', {
            step: 'delete_subtask',
            subtaskId
          });
          return res.status(500).json({ success: false });
        }

        // Логируем успешное удаление подзадачи
        logger.event('subtask_deleted', {
          subtaskId,
          affectedRows: this.changes
        });

        res.json({ success: true });
      });
    }
  );
});

// Удаляет связь задачи с тегом
router.delete('/task-tags/:taskId/:tagId', (req, res) => {
  const { taskId, tagId } = req.params;
  // Удаляем связь из таблицы task_tags
  db.run(
    'DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?',
    [taskId, tagId],
    function (err) {
      // Логируем ошибку при удалении связи
      if (err) {
        logger.error(err, { taskId, tagId });
        logger.trace('delete_task_tag_failed', {
          taskId,
          tagId
        });
        return res.status(500).json({ success: false });
      }

      // Логируем успешное удаление связи
      logger.event('task_tag_deleted', {
        taskId,
        tagId,
        affectedRows: this.changes
      });

      res.json({ success: true });
    }
  );
});

module.exports = router;
