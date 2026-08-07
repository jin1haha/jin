// ===== JIN app =====
// Data model lives entirely in localStorage. Single user, no backend.

const STORE_KEY = 'ledger_data_v1';
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_LABELS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// 11-ASSH LANGUAGE 1B, Group E2 (Afternoon Session), Adviser: Mr. Felix Reyes
// Seeded from the user's class schedule. Days: Sun=1 ... Sat=7.
const SEED_CLASSES = [
  { id:'seed-lcs',    name:'Life and Career Skills',   room:'Ms. Cabrera',   start:'15:30', end:'16:10', days:[2,3,4,5], color:'#6B8F5C' },
  { id:'seed-fil',     name:'Filipino 1',               room:'Ms. Sartillo',  start:'16:10', end:'16:50', days:[2,3,4,5], color:'#5B7FBF' },
  { id:'seed-gsci-a',  name:'General Science',          room:'Mr. Carino',    start:'16:50', end:'17:30', days:[2,5,6],   color:'#C1443A' },
  { id:'seed-gsci-b',  name:'General Science',          room:'Mr. Carino',    start:'18:25', end:'19:05', days:[3],       color:'#C1443A' },
  { id:'seed-gmath-a', name:'General Mathematics',      room:'Mr. Meñez',     start:'16:50', end:'17:30', days:[3,4],     color:'#9A6BBF' },
  { id:'seed-gmath-b', name:'General Mathematics',      room:'Mr. Meñez',     start:'18:25', end:'19:05', days:[2],       color:'#9A6BBF' },
  { id:'seed-gmath-c', name:'General Mathematics',      room:'Mr. Meñez',     start:'17:45', end:'18:25', days:[6],       color:'#9A6BBF' },
  { id:'seed-pask',    name:'Pag-aaral sa Kasaysayan',  room:'Mr. Reyes',     start:'17:45', end:'18:25', days:[2,3,4,5], color:'#C9A227' },
  { id:'seed-cc1-a',   name:'Creative Composition 1',   room:'Ms. Sartillo',  start:'18:25', end:'19:05', days:[4,5],     color:'#6B8F5C' },
  { id:'seed-cc1-b',   name:'Creative Composition 1',   room:'Ms. Sartillo',  start:'19:05', end:'19:45', days:[3],       color:'#6B8F5C' },
  { id:'seed-cc1-c',   name:'Creative Composition 1',   room:'Ms. Sartillo',  start:'16:10', end:'16:50', days:[6],       color:'#6B8F5C' },
  { id:'seed-mk-a',    name:'Mabisang Komunikasyon',    room:'Mr. Carian',    start:'19:05', end:'19:45', days:[4],       color:'#5B7FBF' },
  { id:'seed-mk-b',    name:'Mabisang Komunikasyon',    room:'Mr. Carian',    start:'18:25', end:'19:05', days:[6],       color:'#5B7FBF' },
  { id:'seed-ec',      name:'Effective Communication',  room:'Mr. Cantuangco',start:'19:05', end:'19:45', days:[2],       color:'#C1443A' },
  { id:'seed-hgp',     name:'HGP',                      room:'Mr. Felix',     start:'15:30', end:'16:10', days:[6],       color:'#9A6BBF' },
];

const DEFAULT_PROFILE = {
  section: '11-ASSH LANGUAGE 1B',
  group: 'E2 (Afternoon Session)',
  adviser: 'Mr. Felix Reyes'
};

function loadData(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return { classes: SEED_CLASSES.map(c => ({...c})), tasks: [], profile: {...DEFAULT_PROFILE} };
    const parsed = JSON.parse(raw);
    const classes = (parsed.classes && parsed.classes.length) ? parsed.classes : SEED_CLASSES.map(c => ({...c}));
    const profile = parsed.profile ? { ...DEFAULT_PROFILE, ...parsed.profile } : {...DEFAULT_PROFILE};
    return { classes, tasks: parsed.tasks || [], profile };
  }catch(e){
    console.error('Failed to load data', e);
    return { classes: SEED_CLASSES.map(c => ({...c})), tasks: [], profile: {...DEFAULT_PROFILE} };
  }
}

function saveData(){
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

let state = loadData();
let currentWeekDay = new Date().getDay() + 1; // 1=Sun ... 7=Sat, matches day-picker values
let currentTaskFilter = 'open';

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function todayIso(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}

function fmtTime(t){
  if(!t) return '';
  const [h,m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function fmtDate(iso){
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
}

function toMinutes(t){
  if(!t) return null;
  const [h,m] = t.split(':').map(Number);
  return h * 60 + m;
}

function fmtDuration(mins){
  if(mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ---------- Rendering ----------

function renderDateLine(){
  const now = new Date();
  document.getElementById('dateLine').textContent = now.toLocaleDateString('en-US', {
    weekday:'long', month:'long', day:'numeric'
  });
}

function renderSectionLine(){
  const p = state.profile || DEFAULT_PROFILE;
  const parts = [p.section, p.group, p.adviser ? `Adviser: ${p.adviser}` : ''].filter(Boolean);
  document.getElementById('sectionLine').textContent = parts.join(' · ');
}

function renderProgressStat(){
  const dayNum = new Date().getDay() + 1;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const todaysClasses = classesForDay(dayNum);
  const doneCount = todaysClasses.filter(c => toMinutes(c.end) <= nowMin).length;
  const today = todayIso();
  const dueToday = state.tasks.filter(t => t.due === today && !t.done).length;

  const el = document.getElementById('progressStat');
  if(todaysClasses.length === 0 && dueToday === 0){
    el.textContent = '';
    return;
  }
  const bits = [];
  if(todaysClasses.length) bits.push(`${doneCount}/${todaysClasses.length} classes done today`);
  if(dueToday) bits.push(`${dueToday} task${dueToday === 1 ? '' : 's'} due today`);
  el.textContent = bits.join(' · ');
}

function classesForDay(dayNum){
  return state.classes
    .filter(c => c.days.includes(dayNum))
    .sort((a,b) => a.start.localeCompare(b.start));
}

function renderTodayClasses(){
  const dayNum = new Date().getDay() + 1;
  const list = classesForDay(dayNum);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const container = document.getElementById('todayClasses');
  container.innerHTML = '';
  if(list.length === 0){
    container.innerHTML = '<div class="empty-note">No classes on the books today.</div>';
    return;
  }
  list.forEach(c => container.appendChild(classEntryEl(c, nowMin)));
}

function renderNowStatus(){
  const el = document.getElementById('nowStatus');
  const dayNum = new Date().getDay() + 1;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const list = classesForDay(dayNum);

  const live = list.find(c => nowMin >= toMinutes(c.start) && nowMin < toMinutes(c.end));
  if(live){
    const remaining = toMinutes(live.end) - nowMin;
    el.className = 'now-status live';
    el.innerHTML = `<span class="dot"></span><span class="label">Live now — <strong>${escapeHtml(live.name)}</strong> · ends in ${fmtDuration(remaining)}</span>`;
    return;
  }

  const next = list.find(c => toMinutes(c.start) > nowMin);
  if(next){
    const until = toMinutes(next.start) - nowMin;
    el.className = 'now-status';
    el.innerHTML = `<span class="dot"></span><span class="label">Up next — <strong>${escapeHtml(next.name)}</strong> in ${fmtDuration(until)}</span>`;
    return;
  }

  el.className = 'now-status';
  el.innerHTML = list.length
    ? `<span class="dot"></span><span class="label">No more classes today. You're free.</span>`
    : `<span class="dot"></span><span class="label">No classes today.</span>`;
}

function renderTodayTasks(){
  const today = todayIso();
  const list = state.tasks
    .filter(t => t.due === today && !t.done)
    .sort((a,b) => priorityRank(b.priority) - priorityRank(a.priority));
  const container = document.getElementById('todayTasks');
  container.innerHTML = '';
  if(list.length === 0){
    container.innerHTML = '<div class="empty-note">Nothing due today. Clean slate.</div>';
    return;
  }
  list.forEach(t => container.appendChild(taskEntryEl(t)));
}

function priorityRank(p){ return { high:3, med:2, low:1 }[p] || 0; }

function renderDayTabs(){
  const el = document.getElementById('dayTabs');
  el.innerHTML = '';
  for(let i=1;i<=7;i++){
    const btn = document.createElement('button');
    btn.textContent = DAY_NAMES[i-1];
    btn.dataset.day = i;
    if(i === currentWeekDay) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentWeekDay = i;
      renderDayTabs();
      renderWeekClasses();
    });
    el.appendChild(btn);
  }
}

function renderWeekClasses(){
  const list = classesForDay(currentWeekDay);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const container = document.getElementById('weekClasses');
  container.innerHTML = '';
  if(list.length === 0){
    container.innerHTML = `<div class="empty-note">No classes on ${DAY_LABELS_FULL[currentWeekDay-1]}.</div>`;
    return;
  }
  list.forEach(c => container.appendChild(classEntryEl(c, nowMin)));
}

function renderTasks(){
  let list = state.tasks.slice();
  if(currentTaskFilter === 'open') list = list.filter(t => !t.done);
  else if(currentTaskFilter === 'done') list = list.filter(t => t.done);
  list.sort((a,b) => {
    if(a.done !== b.done) return a.done ? 1 : -1;
    return a.due.localeCompare(b.due);
  });
  const container = document.getElementById('taskList');
  container.innerHTML = '';
  if(list.length === 0){
    container.innerHTML = '<div class="empty-note">Nothing here.</div>';
    return;
  }
  list.forEach(t => container.appendChild(taskEntryEl(t)));
}

function classEntryEl(c, nowMin){
  const div = document.createElement('div');
  div.className = 'entry';
  div.style.borderLeftColor = c.color || '#C9A227';
  const today = new Date();
  const todayDayNum = today.getDay() + 1;
  const isToday = c.days.includes(todayDayNum) && typeof nowMin === 'number';
  const isLive = isToday && nowMin >= toMinutes(c.start) && nowMin < toMinutes(c.end);
  if(isLive) div.classList.add('live-now');
  div.innerHTML = `
    <div class="entry-body">
      <div class="entry-title">${escapeHtml(c.name)}${isLive ? '<span class="live-badge">Now</span>' : ''}</div>
      <div class="entry-meta">
        <span class="time-glow">${fmtTime(c.start)} – ${fmtTime(c.end)}</span>
        ${c.room ? `<span>${escapeHtml(c.room)}</span>` : ''}
      </div>
    </div>
  `;
  div.addEventListener('click', () => openClassModal(c));
  return div;
}

function taskEntryEl(t){
  const div = document.createElement('div');
  div.className = 'entry';
  if(t.done) div.classList.add('done');
  const overdue = !t.done && t.due < todayIso();
  if(overdue) div.classList.add('overdue');
  const linkedClass = state.classes.find(c => c.id === t.classId);

  div.innerHTML = `
    <div class="entry-check ${t.done ? 'checked':''}">${t.done ? '✓':''}</div>
    <div class="entry-body">
      <div class="entry-title">${escapeHtml(t.name)}</div>
      <div class="entry-meta">
        <span>${overdue ? 'Overdue · ' : ''}${fmtDate(t.due)}</span>
        ${linkedClass ? `<span>${escapeHtml(linkedClass.name)}</span>` : ''}
        <span class="pill ${t.priority}">${t.priority}</span>
      </div>
    </div>
  `;
  div.querySelector('.entry-check').addEventListener('click', (e) => {
    e.stopPropagation();
    t.done = !t.done;
    saveData();
    renderAll();
  });
  div.addEventListener('click', () => openTaskModal(t));
  return div;
}

function escapeHtml(s){
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderAll(){
  renderDateLine();
  renderSectionLine();
  renderNowStatus();
  renderProgressStat();
  renderTodayClasses();
  renderTodayTasks();
  renderDayTabs();
  renderWeekClasses();
  renderTasks();
  populateClassSelect();
}

// Keep the live/up-next status and glow states fresh without a full re-render loop
setInterval(() => {
  renderNowStatus();
  renderProgressStat();
  renderTodayClasses();
  if(document.getElementById('view-week').classList.contains('active')) renderWeekClasses();
}, 30000);

// ---------- Tabs (Today / Week / Tasks) ----------

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('view-' + tab.dataset.view).classList.add('active');
  });
});

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTaskFilter = btn.dataset.filter;
    renderTasks();
  });
});

// ---------- Class modal ----------

const classModalOverlay = document.getElementById('classModalOverlay');
const classForm = document.getElementById('classForm');
let selectedClassDays = new Set();
let selectedClassColor = '#C9A227';

function getTeachers(){
  return Array.from(new Set(state.classes.map(c => c.room).filter(Boolean))).sort();
}

function populateTeacherDatalist(){
  const list = document.getElementById('teacherListOptions');
  list.innerHTML = '';
  getTeachers().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    list.appendChild(opt);
  });
}

function openClassModal(existing){
  classForm.reset();
  populateTeacherDatalist();
  selectedClassDays = new Set(existing ? existing.days : []);
  selectedClassColor = existing ? existing.color : '#C9A227';
  document.getElementById('classIdInput').value = existing ? existing.id : '';
  document.getElementById('classNameInput').value = existing ? existing.name : '';
  document.getElementById('classRoomInput').value = existing ? existing.room : '';
  document.getElementById('classStartInput').value = existing ? existing.start : '';
  document.getElementById('classEndInput').value = existing ? existing.end : '';
  document.getElementById('deleteClassBtn').style.display = existing ? 'block' : 'none';
  document.querySelector('#classModalOverlay h2').textContent = existing ? 'Edit class' : 'New class';

  document.querySelectorAll('#classDayPicker button').forEach(b => {
    b.classList.toggle('selected', selectedClassDays.has(Number(b.dataset.day)));
  });
  document.querySelectorAll('#classColorPicker button').forEach(b => {
    b.classList.toggle('selected', b.dataset.color === selectedClassColor);
  });

  classModalOverlay.classList.add('open');
}

document.querySelectorAll('#classDayPicker button').forEach(b => {
  b.addEventListener('click', () => {
    const d = Number(b.dataset.day);
    if(selectedClassDays.has(d)) selectedClassDays.delete(d);
    else selectedClassDays.add(d);
    b.classList.toggle('selected');
  });
});

document.querySelectorAll('#classColorPicker button').forEach(b => {
  b.addEventListener('click', () => {
    selectedClassColor = b.dataset.color;
    document.querySelectorAll('#classColorPicker button').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
  });
});

classForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('classIdInput').value;
  const data = {
    id: id || uid(),
    name: document.getElementById('classNameInput').value.trim(),
    room: document.getElementById('classRoomInput').value.trim(),
    start: document.getElementById('classStartInput').value,
    end: document.getElementById('classEndInput').value,
    days: Array.from(selectedClassDays),
    color: selectedClassColor
  };
  if(data.days.length === 0){
    alert('Pick at least one day for this class.');
    return;
  }
  if(id){
    const idx = state.classes.findIndex(c => c.id === id);
    state.classes[idx] = data;
  }else{
    state.classes.push(data);
  }
  saveData();
  closeModal('classModalOverlay');
  renderAll();
});

document.getElementById('deleteClassBtn').addEventListener('click', () => {
  const id = document.getElementById('classIdInput').value;
  if(!id) return;
  if(!confirm('Delete this class? Linked tasks will stay but lose the link.')) return;
  state.classes = state.classes.filter(c => c.id !== id);
  state.tasks.forEach(t => { if(t.classId === id) t.classId = ''; });
  saveData();
  closeModal('classModalOverlay');
  renderAll();
});

// ---------- Task modal ----------

const taskModalOverlay = document.getElementById('taskModalOverlay');
const taskForm = document.getElementById('taskForm');
let selectedPriority = 'med';

function populateClassSelect(){
  const sel = document.getElementById('taskClassInput');
  const current = sel.value;
  sel.innerHTML = '<option value="">None</option>';
  state.classes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
  sel.value = current;
}

function openTaskModal(existing){
  taskForm.reset();
  selectedPriority = existing ? existing.priority : 'med';
  document.getElementById('taskIdInput').value = existing ? existing.id : '';
  document.getElementById('taskNameInput').value = existing ? existing.name : '';
  document.getElementById('taskDueInput').value = existing ? existing.due : todayIso();
  populateClassSelect();
  document.getElementById('taskClassInput').value = existing ? (existing.classId || '') : '';
  document.getElementById('deleteTaskBtn').style.display = existing ? 'block' : 'none';
  document.querySelector('#taskModalOverlay h2').textContent = existing ? 'Edit task' : 'New task';

  document.querySelectorAll('#taskPriorityPicker button').forEach(b => {
    b.classList.toggle('selected', b.dataset.priority === selectedPriority);
  });

  taskModalOverlay.classList.add('open');
}

document.querySelectorAll('#taskPriorityPicker button').forEach(b => {
  b.addEventListener('click', () => {
    selectedPriority = b.dataset.priority;
    document.querySelectorAll('#taskPriorityPicker button').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
  });
});

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('taskIdInput').value;
  const existing = id ? state.tasks.find(t => t.id === id) : null;
  const data = {
    id: id || uid(),
    name: document.getElementById('taskNameInput').value.trim(),
    due: document.getElementById('taskDueInput').value,
    classId: document.getElementById('taskClassInput').value,
    priority: selectedPriority,
    done: existing ? existing.done : false
  };
  if(id){
    const idx = state.tasks.findIndex(t => t.id === id);
    state.tasks[idx] = data;
  }else{
    state.tasks.push(data);
  }
  saveData();
  closeModal('taskModalOverlay');
  renderAll();
});

document.getElementById('deleteTaskBtn').addEventListener('click', () => {
  const id = document.getElementById('taskIdInput').value;
  if(!id) return;
  if(!confirm('Delete this task?')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveData();
  closeModal('taskModalOverlay');
  renderAll();
});

// ---------- Add picker / FAB ----------

document.getElementById('fab').addEventListener('click', () => {
  document.getElementById('addPickerOverlay').classList.add('open');
});
document.getElementById('pickClass').addEventListener('click', () => {
  closeModal('addPickerOverlay');
  openClassModal(null);
});
document.getElementById('pickTask').addEventListener('click', () => {
  closeModal('addPickerOverlay');
  openTaskModal(null);
});

// ---------- Modal close helpers ----------

function closeModal(id){
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', (e) => {
    if(e.target === ov) ov.classList.remove('open');
  });
});

// ---------- Settings: backup, restore, offline status ----------

document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('settingsModalOverlay').classList.add('open');
});

// ---- Manage teachers (rename propagates to every class using that name) ----

document.getElementById('manageTeachersBtn').addEventListener('click', () => {
  closeModal('settingsModalOverlay');
  renderTeacherList();
  document.getElementById('teacherModalOverlay').classList.add('open');
});

function renderTeacherList(){
  const container = document.getElementById('teacherListRows');
  container.innerHTML = '';
  const teachers = getTeachers();
  if(teachers.length === 0){
    container.innerHTML = '<div class="empty-note">No teachers yet — add one from a class.</div>';
    return;
  }
  teachers.forEach(name => {
    const btn = document.createElement('button');
    const count = state.classes.filter(c => c.room === name).length;
    btn.innerHTML = `${escapeHtml(name)} <span class="hint">${count} class${count === 1 ? '' : 'es'}</span>`;
    btn.addEventListener('click', () => renameTeacher(name));
    container.appendChild(btn);
  });
}

function renameTeacher(oldName){
  const newName = prompt('Rename teacher', oldName);
  if(newName === null) return;
  const trimmed = newName.trim();
  if(!trimmed || trimmed === oldName) return;
  state.classes.forEach(c => { if(c.room === oldName) c.room = trimmed; });
  saveData();
  renderTeacherList();
  renderAll();
}

// ---- Class info (section / group / adviser) ----

document.getElementById('editClassInfoBtn').addEventListener('click', () => {
  closeModal('settingsModalOverlay');
  const p = state.profile || DEFAULT_PROFILE;
  document.getElementById('infoSectionInput').value = p.section || '';
  document.getElementById('infoGroupInput').value = p.group || '';
  document.getElementById('infoAdviserInput').value = p.adviser || '';
  document.getElementById('classInfoModalOverlay').classList.add('open');
});

document.getElementById('classInfoForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.profile = {
    section: document.getElementById('infoSectionInput').value.trim(),
    group: document.getElementById('infoGroupInput').value.trim(),
    adviser: document.getElementById('infoAdviserInput').value.trim()
  };
  saveData();
  closeModal('classInfoModalOverlay');
  renderSectionLine();
});

document.getElementById('exportDataBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = todayIso();
  a.href = url;
  a.download = `jin-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById('importDataBtn').addEventListener('click', () => {
  document.getElementById('importFileInput').click();
});

document.getElementById('importFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(!Array.isArray(parsed.classes) || !Array.isArray(parsed.tasks)){
        throw new Error('Missing classes/tasks arrays');
      }
      if(!confirm('Import this backup? It will replace everything currently in JIN.')) return;
      state = { classes: parsed.classes, tasks: parsed.tasks, profile: parsed.profile ? { ...DEFAULT_PROFILE, ...parsed.profile } : {...DEFAULT_PROFILE} };
      saveData();
      closeModal('settingsModalOverlay');
      renderAll();
    }catch(err){
      alert('That file doesn\'t look like a valid JIN backup.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('resetSeedBtn').addEventListener('click', () => {
  if(!confirm('Replace your current classes with the original 11-ASSH LANGUAGE 1B schedule? Tasks are kept.')) return;
  state.classes = SEED_CLASSES.map(c => ({...c}));
  saveData();
  closeModal('settingsModalOverlay');
  renderAll();
});

document.getElementById('clearDoneBtn').addEventListener('click', () => {
  const doneCount = state.tasks.filter(t => t.done).length;
  if(doneCount === 0){ alert('No completed tasks to clear.'); return; }
  if(!confirm(`Remove ${doneCount} completed task${doneCount === 1 ? '' : 's'}?`)) return;
  state.tasks = state.tasks.filter(t => !t.done);
  saveData();
  closeModal('settingsModalOverlay');
  renderAll();
});

function updateOfflinePill(){
  document.getElementById('offlinePill').classList.toggle('show', !navigator.onLine);
}
window.addEventListener('online', updateOfflinePill);
window.addEventListener('offline', updateOfflinePill);
updateOfflinePill();

// ---------- Service worker ----------

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed', err));
  });
}

// ---------- Init ----------

renderAll();
