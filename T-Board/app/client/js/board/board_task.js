function selectTask(e, id) {
  e.stopPropagation();
  selectedTaskId = id;
  const task = tasks.find(t => t.id === id);
  if (task) task.isSubtasksOpen = true;
  renderColumns();
}

function addTask(colId) {
  const title = prompt('Название задачи:');
  if (!title) return;
  fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ board_id: boardId, column_id: colId, title })
  }).then(() => loadBoard());
}

function deleteTask(taskId) {
  if (confirm('Удалить задачу навсегда?')) {
    fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      .then(() => loadBoard());
  }
}

function drag(e) { e.dataTransfer.setData("taskId", e.target.dataset.id); }
function allowDrop(e) { e.preventDefault(); }

function drop(e) {
  e.preventDefault();
  const taskId = e.dataTransfer.getData("taskId");
  const columnId = e.target.closest('.column').dataset.id;
  fetch(`/api/tasks/${taskId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ column_id: columnId })
  }).then(() => loadBoard());
}