/* ---------- Icons for injected content ---------- */
const ICONS = {
  calendar:'<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  flag:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 3v18"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
  check:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>',
  edit:'<svg class="icon" viewBox="0 0 24 24"><path d="M4 20l1-4 11-11 3 3-11 11-4 1z"/><path d="M14 6l3 3"/></svg>',
  trash:'<svg class="icon" viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg>',
  plus:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  target:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>'
};

/* ---------- State ---------- */
let tasks = JSON.parse(localStorage.getItem('flowspace_tasks') || '[]');
let goals = JSON.parse(localStorage.getItem('flowspace_goals') || '[]');
let editingTaskId = null;

function saveTasks(){ localStorage.setItem('flowspace_tasks', JSON.stringify(tasks)); }
function saveGoals(){ localStorage.setItem('flowspace_goals', JSON.stringify(goals)); }

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function isOverdue(t){
  if(!t.deadline || t.completed) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(t.deadline) < today;
}
function formatDate(dateStr){
  if(!dateStr) return 'no deadline';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {month:'short', day:'numeric'});
}
const priorityRank = {high:0, medium:1, low:2};
function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

/* ---------- Navigation ---------- */
function switchView(view){
  document.querySelectorAll('.side-link, .mobile-nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.getElementById('crumbView').textContent = view;
  if(view === 'analytics') renderAnalytics();
}
document.querySelectorAll('.side-link, .mobile-nav button').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});
document.addEventListener('keydown', e => {
  const modalOpen = taskModalOverlay.classList.contains('active') || goalModalOverlay.classList.contains('active');
  if(e.key === 'Escape' && modalOpen){
    closeTaskModal();
    goalModalOverlay.classList.remove('active');
    return;
  }
  if(modalOpen) return;
  if(['1','2','3','4'].includes(e.key) && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){
    const map = {'1':'dashboard','2':'tasks','3':'goals','4':'analytics'};
    switchView(map[e.key]);
  }
});

/* ---------- Theme ---------- */
function applyTheme(theme){
  if(theme === 'light'){
    document.documentElement.setAttribute('data-theme','light');
    document.getElementById('themeLabel').textContent = 'Dark mode';
    document.getElementById('themeIcon').innerHTML = '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>';
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('themeLabel').textContent = 'Light mode';
    document.getElementById('themeIcon').innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>';
  }
}
let currentTheme = localStorage.getItem('flowspace_theme') || 'dark';
applyTheme(currentTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(currentTheme);
  localStorage.setItem('flowspace_theme', currentTheme);
});

document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'});
(function greet(){
  const h = new Date().getHours();
  document.getElementById('heroGreeting').textContent = h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.';
})();

/* ---------- Task Modal ---------- */
const taskModalOverlay = document.getElementById('taskModalOverlay');
document.getElementById('openTaskModal').addEventListener('click', () => openTaskModal());
document.getElementById('cancelTaskModal').addEventListener('click', closeTaskModal);
taskModalOverlay.addEventListener('click', e => { if(e.target === taskModalOverlay) closeTaskModal(); });

function openTaskModal(task = null){
  editingTaskId = task ? task.id : null;
  document.getElementById('taskModalTitle').textContent = task ? 'edit_task.form' : 'new_task.form';
  document.getElementById('taskTitle').value = task ? task.title : '';
  document.getElementById('taskProject').value = task ? task.project : '';
  document.getElementById('taskDeadline').value = task ? task.deadline : '';
  document.getElementById('taskPriority').value = task ? task.priority : 'medium';
  taskModalOverlay.classList.add('active');
  document.getElementById('taskTitle').focus();
}
function closeTaskModal(){
  taskModalOverlay.classList.remove('active');
  document.getElementById('taskForm').reset();
}
document.getElementById('taskForm').addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('taskTitle').value.trim();
  const project = document.getElementById('taskProject').value.trim() || 'General';
  const deadline = document.getElementById('taskDeadline').value;
  const priority = document.getElementById('taskPriority').value;
  if(editingTaskId){
    const t = tasks.find(t => t.id === editingTaskId);
    Object.assign(t, {title, project, deadline, priority});
  } else {
    tasks.push({id:uid(), title, project, deadline, priority, completed:false, created:Date.now(), completedAt:null});
  }
  closeTaskModal();
  renderAll();
});

/* ---------- Goal Modal ---------- */
const goalModalOverlay = document.getElementById('goalModalOverlay');
document.getElementById('openGoalModal').addEventListener('click', () => {
  document.getElementById('goalForm').reset();
  goalModalOverlay.classList.add('active');
});
document.getElementById('cancelGoalModal').addEventListener('click', () => goalModalOverlay.classList.remove('active'));
goalModalOverlay.addEventListener('click', e => { if(e.target === goalModalOverlay) goalModalOverlay.classList.remove('active'); });
document.getElementById('goalForm').addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('goalTitle').value.trim();
  const target = parseInt(document.getElementById('goalTarget').value, 10);
  goals.push({id:uid(), title, target, progress:0});
  goalModalOverlay.classList.remove('active');
  document.getElementById('goalForm').reset();
  renderAll();
});

/* ---------- Task rendering ---------- */
function getFilteredTasks(){
  const search = document.getElementById('searchInput').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const priority = document.getElementById('filterPriority').value;
  const sortBy = document.getElementById('sortBy').value;

  let list = tasks.filter(t => {
    const mSearch = t.title.toLowerCase().includes(search) || t.project.toLowerCase().includes(search);
    const mStatus = status === 'all' || (status === 'completed' ? t.completed : !t.completed);
    const mPriority = priority === 'all' || t.priority === priority;
    return mSearch && mStatus && mPriority;
  });

  list.sort((a,b) => {
    if(sortBy === 'deadline'){
      if(!a.deadline) return 1;
      if(!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if(sortBy === 'priority') return priorityRank[a.priority] - priorityRank[b.priority];
    if(sortBy === 'created') return b.created - a.created;
    if(sortBy === 'az') return a.title.localeCompare(b.title);
    return 0;
  });
  return list;
}

function renderTasks(){
  const list = getFilteredTasks();
  const container = document.getElementById('taskList');
  const emptyState = document.getElementById('taskEmptyState');
  container.innerHTML = '';
  emptyState.style.display = list.length === 0 ? 'block' : 'none';
  emptyState.textContent = tasks.length === 0
    ? 'no tasks yet — click "new task" to add your first one'
    : 'no tasks match this filter — try clearing search or filters';

  list.forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card' + (task.completed ? ' completed' : '');
    card.dataset.priority = task.priority;
    const overdue = isOverdue(task);
    card.innerHTML = `
      <div class="task-check ${task.completed ? 'checked' : ''}" data-id="${task.id}">${task.completed ? ICONS.check : ''}</div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="chip chip-${task.priority}">${task.priority}</span>
          <span class="meta-item">${ICONS.flag}${escapeHtml(task.project)}</span>
          <span class="meta-item ${overdue ? 'task-overdue' : ''}">${ICONS.calendar}${overdue ? 'overdue · ' : ''}${formatDate(task.deadline)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn edit-task" data-id="${task.id}" title="Edit">${ICONS.edit}</button>
        <button class="icon-btn delete-task" data-id="${task.id}" title="Delete">${ICONS.trash}</button>
      </div>`;
    container.appendChild(card);
  });

  container.querySelectorAll('.task-check').forEach(el => el.addEventListener('click', () => {
    const t = tasks.find(t => t.id === el.dataset.id);
    t.completed = !t.completed;
    t.completedAt = t.completed ? Date.now() : null;
    renderAll();
  }));
  container.querySelectorAll('.edit-task').forEach(el => el.addEventListener('click', () => openTaskModal(tasks.find(t => t.id === el.dataset.id))));
  container.querySelectorAll('.delete-task').forEach(el => el.addEventListener('click', () => {
    tasks = tasks.filter(t => t.id !== el.dataset.id);
    renderAll();
  }));
}
['searchInput','filterStatus','filterPriority','sortBy'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderTasks);
  document.getElementById(id).addEventListener('change', renderTasks);
});

/* ---------- Goals rendering ---------- */
function renderGoals(){
  const container = document.getElementById('goalsList');
  const emptyState = document.getElementById('goalEmptyState');
  container.innerHTML = '';
  emptyState.style.display = goals.length === 0 ? 'block' : 'none';

  goals.forEach(goal => {
    const pct = Math.min(100, Math.round((goal.progress / goal.target) * 100));
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-head">${ICONS.target}<h3>${escapeHtml(goal.title)}</h3></div>
      <div class="goal-bar"><div class="goal-fill" style="width:${pct}%"></div></div>
      <div class="goal-foot"><span>${goal.progress} / ${goal.target}</span><span>${pct}%</span></div>
      <div class="goal-btns">
        <button class="goal-dec" data-id="${goal.id}">${ICONS.minus}</button>
        <button class="goal-inc" data-id="${goal.id}">${ICONS.plus}</button>
        <button class="goal-del" data-id="${goal.id}">${ICONS.trash}</button>
      </div>`;
    container.appendChild(card);
  });

  container.querySelectorAll('.goal-inc').forEach(el => el.addEventListener('click', () => {
    const g = goals.find(g => g.id === el.dataset.id);
    g.progress = Math.min(g.target, g.progress + 1);
    renderAll();
  }));
  container.querySelectorAll('.goal-dec').forEach(el => el.addEventListener('click', () => {
    const g = goals.find(g => g.id === el.dataset.id);
    g.progress = Math.max(0, g.progress - 1);
    renderAll();
  }));
  container.querySelectorAll('.goal-del').forEach(el => el.addEventListener('click', () => {
    goals = goals.filter(g => g.id !== el.dataset.id);
    renderAll();
  }));
}

/* ---------- Dashboard rendering ---------- */
function renderDashboard(){
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(isOverdue).length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statCompleted').textContent = completed;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statOverdue').textContent = overdue;
  document.getElementById('sideStatus').textContent = overdue > 0 ? overdue + ' item' + (overdue>1?'s':'') + ' overdue' : 'all systems nominal';

  const upcoming = tasks.filter(t => !t.completed && t.deadline).sort((a,b) => new Date(a.deadline)-new Date(b.deadline)).slice(0,5);
  document.getElementById('upcomingCount').textContent = upcoming.length;
  document.getElementById('upcomingList').innerHTML = upcoming.length
    ? upcoming.map(t => `<div class="row-item"><span class="title-txt">${escapeHtml(t.title)}</span><span class="meta"><span class="chip chip-${t.priority}">${formatDate(t.deadline)}</span></span></div>`).join('')
    : '<p class="empty-note">no upcoming deadlines</p>';

  document.getElementById('goalsCount').textContent = goals.length;
  document.getElementById('goalsPreview').innerHTML = goals.length
    ? goals.slice(0,4).map(g => {
        const pct = Math.min(100, Math.round((g.progress/g.target)*100));
        return `<div class="row-item"><span class="title-txt">${escapeHtml(g.title)}</span><span class="meta">${pct}%</span></div>`;
      }).join('')
    : '<p class="empty-note">no goals yet</p>';

  renderHeatmap();
  renderDiffstat();
}

function renderHeatmap(){
  const grid = document.getElementById('heatGrid');
  grid.innerHTML = '';
  const days = 12 * 7;
  const counts = {};
  tasks.forEach(t => {
    if(t.completed && t.completedAt){
      const key = new Date(t.completedAt).toDateString();
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  const today = new Date();
  for(let i = days - 1; i >= 0; i--){
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const c = counts[d.toDateString()] || 0;
    const cell = document.createElement('div');
    cell.className = 'heat-cell';
    let bg = 'var(--border)';
    if(c === 1) bg = 'var(--accent-soft)';
    else if(c === 2) bg = 'var(--accent)';
    else if(c >= 3) bg = 'var(--accent-bright)';
    cell.style.background = bg;
    cell.title = d.toLocaleDateString('en-US', {month:'short', day:'numeric'}) + ' · ' + c + ' completed';
    grid.appendChild(cell);
  }
}

function renderDiffstat(){
  const counts = {high:0, medium:0, low:0};
  tasks.forEach(t => counts[t.priority]++);
  const total = Math.max(1, tasks.length);
  const bar = document.getElementById('diffstatBar');
  bar.innerHTML = ['high','medium','low'].map(k => {
    const pct = (counts[k]/total)*100;
    return pct > 0 ? `<div class="diffstat-seg-${k}" style="width:${pct}%"></div>` : '';
  }).join('');
  const keys = document.getElementById('diffstatKeys');
  const colors = {high:'var(--coral)', medium:'var(--amber)', low:'var(--mint)'};
  keys.innerHTML = ['high','medium','low'].map(k => `<span><span class="sq" style="background:${colors[k]}"></span>${counts[k]} ${k}</span>`).join('');
}

/* ---------- Analytics rendering ---------- */
function renderAnalytics(){
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pct = total > 0 ? Math.round((completed/total)*100) : 0;
  const circumference = 345.6;
  document.getElementById('analyticsRing').style.strokeDashoffset = circumference - (pct/100)*circumference;
  document.getElementById('analyticsPct').textContent = pct + '%';

  const counts = {high:0, medium:0, low:0};
  tasks.forEach(t => counts[t.priority]++);
  const maxP = Math.max(1, ...Object.values(counts));
  document.getElementById('priorityBars').innerHTML = Object.entries(counts).map(([k,v]) => `
    <div class="bar-row"><span class="bar-label">${k}</span><div class="bar-track"><div class="bar-fill" style="width:${(v/maxP)*100}%"></div></div><span class="bar-count">${v}</span></div>`).join('');

  const projectCounts = {};
  tasks.forEach(t => { projectCounts[t.project] = (projectCounts[t.project]||0)+1; });
  const entries = Object.entries(projectCounts);
  const maxProj = Math.max(1, ...Object.values(projectCounts));
  document.getElementById('projectBars').innerHTML = entries.length
    ? entries.map(([name,v]) => `<div class="bar-row"><span class="bar-label">${escapeHtml(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${(v/maxProj)*100}%"></div></div><span class="bar-count">${v}</span></div>`).join('')
    : '<p class="empty-note">no tasks yet</p>';
}

function renderAll(){
  saveTasks();
  saveGoals();
  renderDashboard();
  renderTasks();
  renderGoals();
  if(document.getElementById('view-analytics').classList.contains('active')) renderAnalytics();
}

renderAll();
