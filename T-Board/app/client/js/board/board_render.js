function renderTags() {
  document.getElementById('tagList').innerHTML = tags.map(t => `
    <span class="tag" style="background:${t.color}" onclick="toggleTag(event, ${t.id})">${t.name}</span>
  `).join('');
}

function renderColumns() {
  document.getElementById('columns').innerHTML = columns.map(col => `
    <div class="column" data-id="${col.id}" ondrop="drop(event)" ondragover="allowDrop(event)">
      <h3>${col.title}</h3>
      ${tasks.filter(t => t.column_id == col.id).map(renderTask).join('')}
      <div class="add-task" onclick="addTask(${col.id})">+ Добавить задачу</div>
    </div>
  `).join('');
}

function renderTask(task) {
  return `
    <div class="task ${selectedTaskId == task.id ? 'selected' : ''}"
         draggable="true" 
         ondragstart="drag(event)" 
         data-id="${task.id}"
         onclick="selectTask(event, ${task.id})">
      
      <div class="task-content" onclick="event.stopPropagation()">
        <strong>${task.title}</strong>
        
        <button class="delete-task-btn" onclick="event.stopPropagation(); deleteTask(${task.id})">
          ✕
        </button>

        ${renderTaskTags(task)}
        ${renderSubTasksSection(task)}
      </div>
    </div>
  `;
}

function renderTaskTags(task) {
  if (!task.task_tags?.length) return '';
  return `<div class="tags">
    ${task.task_tags.map(t => 
      `<span class="tag" style="background:${t.color}" onclick="toggleTag(event, ${t.id})">${t.name}</span>`
    ).join('')}
  </div>`;
}

function renderSubTasksSection(task) {
  const subTasks = task.sub_tasks || [];
  const isOpen = task.isSubtasksOpen;

  return `
    <div class="custom-subtasks">
      <div class="subtasks-header" onclick="toggleSubtasks(${task.id})">
        <span>Субтаски (${subTasks.length})</span>
        <span>${isOpen ? '▲' : '▼'}</span>
      </div>

      ${isOpen ? `
        <div class="subtasks-content">
          ${subTasks.map(renderSubTask).join('')}
          <input type="text" placeholder="Новая субтаска (Enter)"
                 onkeydown="handleNewSubtask(event, ${task.id}, this)">
        </div>
      ` : ''}
    </div>
  `;
}

function renderSubTask(sub) {
  const escaped = sub.title.replace(/'/g, "\\'");
  return `
    <div class="sub-task">
      <input type="checkbox" ${sub.completed ? 'checked' : ''} 
             onchange="toggleSubCompleted(${sub.id}, this.checked)">
      <span ondblclick="editSubtask(this, ${sub.id}, '${escaped}')">
        ${sub.title}
      </span>
      <button class="delete-subtask-btn" onclick="event.stopPropagation(); deleteSub(${sub.id})">
        ⛒
      </button>
    </div>
  `;
}