async function loadBoards() {
  const res = await fetch('/api/boards');
  const boards = await res.json();
  document.getElementById('boards').innerHTML = boards.map(b => `
    <div class="board" onclick="location.href='/board.html?id=${b.id}'">
      <strong>${b.title}</strong><br>
      <small>Создано: ${new Date(b.created_at).toLocaleDateString('ru-RU')}</small>
      <button class="delete-board-btn" onclick="event.stopPropagation(); deleteBoard(${b.id})">
        ✕
      </button>
    </div>
  `).join('');
}

async function createBoard() {
  const title = document.getElementById('boardTitle').value.trim();
  if (!title) return alert('Введите название');
  await fetch('/api/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  document.getElementById('boardTitle').value = '';
  loadBoards();
}

async function deleteBoard(id) {
  if (confirm('Удалить доску навсегда?')) {
    await fetch(`/api/boards/${id}`, { method: 'DELETE' });
    loadBoards();
  }
}

loadBoards();