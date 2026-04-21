function toggleSubtasks(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.isSubtasksOpen = !task.isSubtasksOpen;
    renderColumns();
  }
}

function handleNewSubtask(e, taskId, input) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;

    fetch('/api/subtasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, title })
    }).then(() => {
      input.value = '';
      loadBoard();
    });
  }
}

function toggleSubCompleted(subId, checked) {
  fetch(`/api/subtasks/${subId}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: checked })
  }).then(() => loadBoard());
}

function deleteSub(subId) {
  if (confirm('Удалить субтаск?')) {
    fetch(`/api/subtasks/${subId}`, { method: 'DELETE' }).then(() => loadBoard());
  }
}

function editSubtask(span, subId, oldTitle) {
  if (span.querySelector('input')) return;
  const input = document.createElement('input');
  input.type = 'text'; input.value = oldTitle;
  input.className = 'edit-subtask-input';
  input.onkeydown = e => {
    if (e.key === 'Enter') saveSubtask(subId, input.value.trim() || oldTitle);
    if (e.key === 'Escape') span.textContent = oldTitle;
  };
  input.onblur = () => saveSubtask(subId, input.value.trim() || oldTitle);
  span.textContent = ''; span.appendChild(input); input.focus(); input.select();
}

async function saveSubtask(subId, newTitle) {
  await fetch(`/api/subtasks/${subId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: newTitle })
  });
  loadBoard();
}