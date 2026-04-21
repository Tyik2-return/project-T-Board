const params = new URLSearchParams(location.search);
const boardId = params.get('id');

let columns = [], tasks = [], tags = [], selectedTaskId = null, ws;

async function loadBoard() {
  const res = await fetch(`/api/boards/${boardId}`);
  const data = await res.json();
  document.getElementById('boardTitle').textContent = data.title || 'Без названия';
  columns = data.columns || [];
  tasks = data.tasks || [];
  tags = data.tags || [];

  tasks.forEach(task => {
    if (!task.hasOwnProperty('isSubtasksOpen')) task.isSubtasksOpen = true;
  });

  renderTags();
  renderColumns();
}

function connectWS() {
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', boardId }));
  ws.onmessage = () => loadBoard();
}

loadBoard();
connectWS();