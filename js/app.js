// ===== JIN app =====
// Data model lives entirely in localStorage. Single user, no backend.

const STORE_KEY = 'ledger_data_v1';
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_LABELS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// 11-ASSH LANGUAGE 1B, Group E2 (Afternoon Session), Adviser: Mr. Felix Reyes
// Seeded from the user's class schedule. Days: Sun=1 ... Sat=7.
// Bump this whenever SEED_CLASSES below is intentionally corrected (a typo'd
// teacher name, a missing period, etc). Anyone who already has saved data
// gets those specific fixes auto-applied on next load — no manual "Restore
// original schedule" needed. Custom classes they added themselves are never
// touched; only entries whose id still matches a seed-* id get refreshed.
const SEED_VERSION = 3;

const SEED_CLASSES = [
  { id:'seed-lcs',    name:'Life and Career Skills',   room:'Ms. Aica',      start:'15:30', end:'16:10', days:[2,3,4,5], color:'#6B8F5C' },
  { id:'seed-fil',     name:'Filipino 1',               room:'Ms. Shicka',    start:'16:10', end:'16:50', days:[2,3,4,5], color:'#5B7FBF' },
  { id:'seed-gsci-a',  name:'General Science',          room:'Mr. Miguel',    start:'16:50', end:'17:30', days:[2,5,6],   color:'#C1443A' },
  { id:'seed-gsci-b',  name:'General Science',          room:'Mr. Miguel',    start:'18:25', end:'19:05', days:[3],       color:'#C1443A' },
  { id:'seed-gmath-a', name:'General Mathematics',      room:'Mr. Arnold',    start:'16:50', end:'17:30', days:[3,4],     color:'#9A6BBF' },
  { id:'seed-gmath-b', name:'General Mathematics',      room:'Mr. Arnold',    start:'18:25', end:'19:05', days:[2],       color:'#9A6BBF' },
  { id:'seed-gmath-c', name:'General Mathematics',      room:'Mr. Arnold',    start:'17:45', end:'18:25', days:[6],       color:'#9A6BBF' },
  { id:'seed-pask',    name:'Pag-aaral sa Kasaysayan',  room:'Mr. Felix',     start:'17:45', end:'18:25', days:[2,3,4,5], color:'#C9A227' },
  { id:'seed-cc1-a',   name:'Creative Composition 1',   room:'Mr. Jesrick',   start:'18:25', end:'19:05', days:[4,5],     color:'#6B8F5C' },
  { id:'seed-cc1-b',   name:'Creative Composition 1',   room:'Mr. Jesrick',   start:'19:05', end:'19:45', days:[3],       color:'#6B8F5C' },
  { id:'seed-cc1-c',   name:'Creative Composition 1',   room:'Mr. Jesrick',   start:'16:10', end:'16:50', days:[6],       color:'#6B8F5C' },
  { id:'seed-mk-a',    name:'Mabisang Komunikasyon',    room:'Mr. Mark',      start:'19:05', end:'19:45', days:[4],       color:'#5B7FBF' },
  { id:'seed-mk-b',    name:'Mabisang Komunikasyon',    room:'Mr. Mark',      start:'18:25', end:'19:05', days:[6],       color:'#5B7FBF' },
  { id:'seed-ec',      name:'Effective Communication',  room:'Mr. Jesrick',   start:'19:05', end:'19:45', days:[2,6],     color:'#C1443A' },
  { id:'seed-hgp',     name:'HGP',                      room:'Mr. Felix',     start:'15:30', end:'16:10', days:[6],       color:'#9A6BBF' },
  { id:'seed-break',   name:'Break Time',                room:'',             start:'17:30', end:'17:45', days:[2,3,4,5,6], color:'#5a5a5a', isBreak:true },
];

const DEFAULT_PROFILE = {
  section: '11-ASSH LANGUAGE 1B',
  group: 'E2 (Afternoon Session)',
  adviser: 'Mr. Felix Reyes'
};

const DEFAULT_SETTINGS = {
  accent: '#FFFFFF',
  bgImage: null,
  bgDim: 78,
  notifyClass: false,
  notifyMinutes: 10,
  notifyTasks: false
};

function migrateSeedClasses(classes){
  const byId = Object.fromEntries(SEED_CLASSES.map(c => [c.id, c]));
  const existingIds = new Set(classes.map(c => c.id));
  const updated = classes.map(c => {
    const fresh = byId[c.id];
    if(!fresh) return c; // not a seed class (user-created), leave alone
    // keep any custom icon the user picked; refresh everything else
    return { ...fresh, icon: c.icon || fresh.icon || '' };
  });
  // Add any brand-new seed entries (e.g. Break Time) that this saved data
  // predates, so existing users pick them up automatically too.
  SEED_CLASSES.forEach(sc => {
    if(!existingIds.has(sc.id)) updated.push({...sc});
  });
  return updated;
}

function loadData(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return { classes: SEED_CLASSES.map(c => ({...c})), tasks: [], profile: {...DEFAULT_PROFILE}, settings: {...DEFAULT_SETTINGS}, seedVersion: SEED_VERSION };
    const parsed = JSON.parse(raw);
    let classes = (parsed.classes && parsed.classes.length) ? parsed.classes : SEED_CLASSES.map(c => ({...c}));
    if((parsed.seedVersion || 0) < SEED_VERSION){
      classes = migrateSeedClasses(classes);
    }
    const profile = parsed.profile ? { ...DEFAULT_PROFILE, ...parsed.profile } : {...DEFAULT_PROFILE};
    const settings = parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : {...DEFAULT_SETTINGS};
    return { classes, tasks: parsed.tasks || [], profile, settings, seedVersion: SEED_VERSION };
  }catch(e){
    console.error('Failed to load data', e);
    return { classes: SEED_CLASSES.map(c => ({...c})), tasks: [], profile: {...DEFAULT_PROFILE}, settings: {...DEFAULT_SETTINGS}, seedVersion: SEED_VERSION };
  }
}

function saveData(){
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

let state = loadData();
saveData(); // persist seedVersion + any auto-applied schedule fixes right away
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

// ---------- Notifications (local only — no server/push, only fires while JIN is open) ----------

const NOTIFIED_KEY = 'jin_notified_v1';

function getNotifiedStore(){
  try{
    const raw = localStorage.getItem(NOTIFIED_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if(!parsed || parsed.date !== todayIso()) return { date: todayIso(), ids: [] };
    return parsed;
  }catch(e){ return { date: todayIso(), ids: [] }; }
}

function markNotified(id){
  const store = getNotifiedStore();
  if(!store.ids.includes(id)) store.ids.push(id);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(store));
}

function alreadyNotified(id){
  return getNotifiedStore().ids.includes(id);
}

async function fireNotification(title, body, tag){
  if(Notification.permission !== 'granted') return;
  try{
    if(navigator.serviceWorker && navigator.serviceWorker.ready){
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
    }else{
      new Notification(title, { body, tag });
    }
  }catch(e){ console.warn('Notification failed', e); }
}

function checkNotifications(){
  const s = state.settings || DEFAULT_SETTINGS;
  if(Notification.permission !== 'granted') return;
  const dayNum = new Date().getDay() + 1;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  if(s.notifyClass){
    classesForDay(dayNum).filter(c => !c.isBreak).forEach(c => {
      const diff = toMinutes(c.start) - nowMin;
      const key = `class:${todayIso()}:${c.id}`;
      if(diff >= 0 && diff <= (s.notifyMinutes || 10) && !alreadyNotified(key)){
        fireNotification(
          `Starting in ${diff <= 1 ? 'a minute' : diff + ' min'}: ${c.name}`,
          c.room ? `With ${c.room} · ${fmtTime(c.start)}` : fmtTime(c.start),
          key
        );
        markNotified(key);
      }
    });
  }

  if(s.notifyTasks){
    state.tasks.filter(t => !t.done && t.due === todayIso()).forEach(t => {
      const key = `task:${todayIso()}:${t.id}`;
      if(!alreadyNotified(key)){
        fireNotification(`Due today: ${t.name}`, t.time ? `By ${fmtTime(t.time)}` : 'No specific time set', key);
        markNotified(key);
      }
    });
  }
}

function applyAppearance(){
  const s = state.settings || DEFAULT_SETTINGS;
  document.documentElement.style.setProperty('--gold', s.accent || '#FFFFFF');
  const dim = (s.bgDim != null ? s.bgDim : 78) / 100;
  document.documentElement.style.setProperty('--bg-dim-color', `rgba(10,10,10,${dim})`);
  if(s.bgImage){
    document.body.style.backgroundImage = `url(${s.bgImage})`;
    document.body.classList.add('has-bg-image');
  }else{
    document.body.style.backgroundImage = '';
    document.body.classList.remove('has-bg-image');
  }
}

// Resize/compress an uploaded image client-side before storing as base64,
// so backgrounds and icons don't bloat localStorage.
function readImageResized(file, maxDim, quality){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read image'));
      img.onload = () => {
        let { width, height } = img;
        if(width > maxDim || height > maxDim){
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
  const todaysClasses = classesForDay(dayNum).filter(c => !c.isBreak);
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
  const q = (document.getElementById('taskSearchInput').value || '').trim().toLowerCase();
  if(q){
    list = list.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  }
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
  if(c.isBreak) div.classList.add('break-entry');
  div.style.borderLeftColor = c.color || '#C9A227';
  const today = new Date();
  const todayDayNum = today.getDay() + 1;
  const isToday = c.days.includes(todayDayNum) && typeof nowMin === 'number';
  const isLive = isToday && nowMin >= toMinutes(c.start) && nowMin < toMinutes(c.end);
  if(isLive) div.classList.add('live-now');
  const iconHtml = c.icon
    ? (c.icon.startsWith('data:') ? `<img src="${c.icon}" alt="">` : c.icon)
    : (c.isBreak ? '☕' : (c.name ? c.name.charAt(0).toUpperCase() : '?'));
  div.innerHTML = `
    <div class="entry-icon" style="${c.icon ? '' : `background:${c.color || '#C9A227'}22; color:${c.color || '#C9A227'};`}">${iconHtml}</div>
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
  const dueLabel = fmtDate(t.due) + (t.time ? ` · ${fmtTime(t.time)}` : '');

  div.innerHTML = `
    <div class="entry-check ${t.done ? 'checked':''}">${t.done ? '✓':''}</div>
    <div class="entry-body">
      <div class="entry-title">${escapeHtml(t.name)}${t.notes ? ' <span class="hint">📝</span>' : ''}</div>
      <div class="entry-meta">
        <span>${overdue ? 'Overdue · ' : ''}${dueLabel}</span>
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
  checkNotifications();
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

document.getElementById('taskSearchInput').addEventListener('input', renderTasks);

document.getElementById('prevDayBtn').addEventListener('click', () => {
  currentWeekDay = currentWeekDay === 1 ? 7 : currentWeekDay - 1;
  renderDayTabs();
  renderWeekClasses();
});
document.getElementById('nextDayBtn').addEventListener('click', () => {
  currentWeekDay = currentWeekDay === 7 ? 1 : currentWeekDay + 1;
  renderDayTabs();
  renderWeekClasses();
});

// ---------- Class modal ----------

const classModalOverlay = document.getElementById('classModalOverlay');
const classForm = document.getElementById('classForm');
let selectedClassDays = new Set();
let selectedClassColor = '#C9A227';
let selectedClassIcon = '';

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
  selectedClassIcon = existing ? (existing.icon || '') : '';
  document.getElementById('classIdInput').value = existing ? existing.id : '';
  document.getElementById('classNameInput').value = existing ? existing.name : '';
  document.getElementById('classRoomInput').value = existing ? existing.room : '';
  document.getElementById('classStartInput').value = existing ? existing.start : '';
  document.getElementById('classEndInput').value = existing ? existing.end : '';
  document.getElementById('classIconInput').value = selectedClassIcon;
  document.getElementById('deleteClassBtn').style.display = existing ? 'block' : 'none';
  document.getElementById('duplicateClassBtn').style.display = existing ? 'block' : 'none';
  document.querySelector('#classModalOverlay h2').textContent = existing ? 'Edit class' : 'New class';

  document.querySelectorAll('#classDayPicker button').forEach(b => {
    b.classList.toggle('selected', selectedClassDays.has(Number(b.dataset.day)));
  });
  document.querySelectorAll('#classColorPicker button').forEach(b => {
    b.classList.toggle('selected', b.dataset.color === selectedClassColor);
  });
  updateIconPickerUI();

  classModalOverlay.classList.add('open');
}

function updateIconPickerUI(){
  const isCustom = selectedClassIcon.startsWith('data:');
  document.querySelectorAll('#classIconPicker button').forEach(b => {
    b.classList.toggle('selected', !isCustom && b.dataset.icon === selectedClassIcon);
  });
  const wrap = document.getElementById('classIconPreviewWrap');
  const preview = document.getElementById('classIconPreview');
  if(isCustom){
    wrap.style.display = 'flex';
    preview.src = selectedClassIcon;
  }else{
    wrap.style.display = 'none';
    preview.src = '';
  }
}

document.querySelectorAll('#classIconPicker button').forEach(b => {
  b.addEventListener('click', () => {
    selectedClassIcon = b.dataset.icon;
    document.getElementById('classIconInput').value = selectedClassIcon;
    updateIconPickerUI();
  });
});

document.getElementById('classIconUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  try{
    selectedClassIcon = await readImageResized(file, 160, 0.85);
    document.getElementById('classIconInput').value = selectedClassIcon;
    updateIconPickerUI();
  }catch(err){
    alert('Could not read that image.');
  }
  e.target.value = '';
});

document.getElementById('classIconClear').addEventListener('click', () => {
  selectedClassIcon = '';
  document.getElementById('classIconInput').value = '';
  updateIconPickerUI();
});

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
  const prior = id ? state.classes.find(c => c.id === id) : null;
  const data = {
    id: id || uid(),
    name: document.getElementById('classNameInput').value.trim(),
    room: document.getElementById('classRoomInput').value.trim(),
    start: document.getElementById('classStartInput').value,
    end: document.getElementById('classEndInput').value,
    days: Array.from(selectedClassDays),
    color: selectedClassColor,
    icon: selectedClassIcon
  };
  if(prior && prior.isBreak) data.isBreak = true;
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

document.getElementById('duplicateClassBtn').addEventListener('click', () => {
  const id = document.getElementById('classIdInput').value;
  const existing = state.classes.find(c => c.id === id);
  if(!existing) return;
  const copy = { ...existing, id: uid(), name: existing.name + ' (copy)' };
  state.classes.push(copy);
  saveData();
  renderAll();
  openClassModal(copy);
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
  document.getElementById('taskTimeInput').value = existing ? (existing.time || '') : '';
  document.getElementById('taskNotesInput').value = existing ? (existing.notes || '') : '';
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
    time: document.getElementById('taskTimeInput').value,
    classId: document.getElementById('taskClassInput').value,
    priority: selectedPriority,
    notes: document.getElementById('taskNotesInput').value.trim(),
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

// ---- Appearance: accent color + background photo ----

function syncSettingsUI(){
  const s = state.settings || DEFAULT_SETTINGS;
  document.querySelectorAll('#accentPicker button').forEach(b => {
    b.classList.toggle('selected', b.dataset.accent === (s.accent || '#FFFFFF'));
  });
  document.getElementById('bgDimInput').value = s.bgDim != null ? s.bgDim : 78;
  document.getElementById('bgDimValue').textContent = `${s.bgDim != null ? s.bgDim : 78}%`;
  const preview = document.getElementById('bgPreview');
  if(s.bgImage){
    preview.style.backgroundImage = `url(${s.bgImage})`;
    preview.textContent = '';
  }else{
    preview.style.backgroundImage = '';
    preview.textContent = 'No custom background set';
  }

  document.getElementById('notifyClassToggle').classList.toggle('on', !!s.notifyClass);
  document.getElementById('notifyTaskToggle').classList.toggle('on', !!s.notifyTasks);
  document.getElementById('notifyMinutesRow').classList.toggle('open', !!s.notifyClass);
  document.getElementById('notifyMinutesInput').value = s.notifyMinutes || 10;

  if(Notification && Notification.permission === 'denied'){
    document.getElementById('notifyPermNote').textContent = 'Notifications are blocked for this site in your browser settings — enable them there first if you want reminders.';
  }
}

document.getElementById('notifyClassToggle').addEventListener('click', async () => {
  const turningOn = !state.settings.notifyClass;
  if(turningOn && Notification.permission === 'default'){
    const perm = await Notification.requestPermission();
    if(perm !== 'granted'){ syncSettingsUI(); return; }
  }
  if(turningOn && Notification.permission === 'denied'){ syncSettingsUI(); return; }
  state.settings.notifyClass = turningOn;
  saveData();
  syncSettingsUI();
});

document.getElementById('notifyTaskToggle').addEventListener('click', async () => {
  const turningOn = !state.settings.notifyTasks;
  if(turningOn && Notification.permission === 'default'){
    const perm = await Notification.requestPermission();
    if(perm !== 'granted'){ syncSettingsUI(); return; }
  }
  if(turningOn && Notification.permission === 'denied'){ syncSettingsUI(); return; }
  state.settings.notifyTasks = turningOn;
  saveData();
  syncSettingsUI();
});

document.getElementById('notifyMinutesInput').addEventListener('change', (e) => {
  state.settings.notifyMinutes = Number(e.target.value);
  saveData();
});

// ---- Install app (explicit button, plus fallback if the browser never offers the prompt) ----

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('installedNote').style.display = 'none';
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  document.getElementById('installAppBtn').style.display = 'none';
  document.getElementById('installedNote').style.display = 'block';
});

if(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone){
  document.getElementById('installedNote').style.display = 'block';
}

document.getElementById('installAppBtn').addEventListener('click', async () => {
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if(choice.outcome === 'accepted'){
      document.getElementById('installAppBtn').style.display = 'none';
      document.getElementById('installedNote').style.display = 'block';
    }
    deferredInstallPrompt = null;
  }else{
    const reasons = [];
    if(!('serviceWorker' in navigator)) reasons.push('this browser doesn\'t support service workers');
    else if(!navigator.serviceWorker.controller) reasons.push('the service worker hasn\'t finished registering yet — try reloading the page once and wait a few seconds before tapping this again');
    if(location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') reasons.push('the page isn\'t loaded over HTTPS');
    const detail = reasons.length ? '\n\nPossible reason: ' + reasons[0] : '';
    alert('Chrome hasn\'t offered its install prompt for this page yet.' + detail + '\n\nManual option: tap the ⋮ menu (top right of Chrome) → "Install app" or "Add to Home screen". If you\'re in an in-app browser (Messenger, Instagram, etc.), open the link in Chrome directly first.');
  }
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  syncSettingsUI();
  document.getElementById('settingsModalOverlay').classList.add('open');
});

document.querySelectorAll('#accentPicker button').forEach(b => {
  b.addEventListener('click', () => {
    state.settings.accent = b.dataset.accent;
    saveData();
    applyAppearance();
    syncSettingsUI();
  });
});

document.getElementById('bgUploadInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  try{
    state.settings.bgImage = await readImageResized(file, 1080, 0.75);
    saveData();
    applyAppearance();
    syncSettingsUI();
  }catch(err){
    alert('Could not read that image.');
  }
  e.target.value = '';
});

document.getElementById('bgClearBtn').addEventListener('click', () => {
  state.settings.bgImage = null;
  saveData();
  applyAppearance();
  syncSettingsUI();
});

document.getElementById('bgDimInput').addEventListener('input', (e) => {
  state.settings.bgDim = Number(e.target.value);
  document.getElementById('bgDimValue').textContent = `${e.target.value}%`;
  applyAppearance();
});
document.getElementById('bgDimInput').addEventListener('change', () => saveData());

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
    const count = state.classes.filter(c => c.room === name).length;
    const row = document.createElement('div');
    row.className = 'teacher-row';
    row.innerHTML = `
      <input type="text" value="${escapeHtml(name)}">
      <span class="hint">${count} class${count === 1 ? '' : 'es'}</span>
      <button type="button" class="save-btn">Save</button>
    `;
    const input = row.querySelector('input');
    const saveBtn = row.querySelector('.save-btn');
    input.addEventListener('input', () => {
      saveBtn.classList.toggle('dirty', input.value.trim() !== name && input.value.trim() !== '');
    });
    const commit = () => {
      const trimmed = input.value.trim();
      if(!trimmed || trimmed === name) return;
      state.classes.forEach(c => { if(c.room === name) c.room = trimmed; });
      saveData();
      renderTeacherList();
      renderAll();
    };
    saveBtn.addEventListener('click', commit);
    input.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); commit(); } });
    container.appendChild(row);
  });
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
      state = {
        classes: migrateSeedClasses(parsed.classes),
        tasks: parsed.tasks,
        profile: parsed.profile ? { ...DEFAULT_PROFILE, ...parsed.profile } : {...DEFAULT_PROFILE},
        settings: parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : {...DEFAULT_SETTINGS},
        seedVersion: SEED_VERSION
      };
      saveData();
      applyAppearance();
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

applyAppearance();
renderAll();
