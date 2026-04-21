async function toggleTag(e, tagId) {
  e.stopPropagation();
  if (!selectedTaskId) return alert('Выберите задачу');
  const has = tasks.find(t => t.id == selectedTaskId)?.task_tags?.some(t => t.id == tagId);
  if (has) {
    await fetch(`/api/task-tags/${selectedTaskId}/${tagId}`, { method: 'DELETE' });
  } else {
    await fetch('/api/task-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: selectedTaskId, tag_id: tagId })
    });
  }
  loadBoard();
}

async function createTag() {
  const name = document.getElementById('tagName').value.trim();
  const color = document.getElementById('tagColor').value;
  if (!name) return alert('Введите название');
  await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ board_id: boardId, name, color })
  });
  document.getElementById('tagName').value = '';
  loadBoard();
}