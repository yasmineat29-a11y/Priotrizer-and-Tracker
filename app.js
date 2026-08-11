let appState = null;
let currentSelectedMonth = new Date().getMonth(); // Default to current month (0-11)

async function initApp() {
  const res = await fetch('data.json');
  appState = await res.json();
  document.getElementById('live-date').textContent = new Date().toISOString().split('T')[0];
  document.getElementById('month-picker').value = currentSelectedMonth;
  renderAll();
}

function calculatePaceRatio(done, dues) {
  if (!dues || dues === 0) return 0;
  const now = new Date();
  const day = now.getDate();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const timeProgress = day / totalDays;
  return timeProgress > 0 ? (done / dues) / timeProgress : 0;
}

function renderAll() {
  renderDashboard();
  renderPrioritizerGrid();
  renderSourcesGrid();
  renderSettings();
  lucide.createIcons();
}

/* --- DASHBOARD LOGIC --- */
function renderDashboard() {
  const container = document.getElementById('dashboard-cards');
  container.innerHTML = '';

  appState.paces.forEach(p => {
    let totalDone = 0;
    const paceTasks = appState.tasks.filter(t => t.paceId === p.id).map(t => t.id);

    paceTasks.forEach(tid => {
      Object.keys(appState.prioritizerGrid).forEach(d => {
        totalDone += Number(appState.prioritizerGrid[d][tid] || 0);
      });
    });

    const dues = parseFloat(p.dues) || 0;
    const paceRatio = calculatePaceRatio(totalDone, dues);
    const pct = dues > 0 ? Math.round((totalDone / dues) * 100) : 0;
    const isTrack = paceRatio >= 1;

    container.innerHTML += `
      <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md flex flex-col justify-between space-y-3">
        <div>
          <div class="flex justify-between items-start mb-2">
            <span class="font-semibold text-slate-200 text-sm">${p.name || 'Unnamed Pace'}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isTrack ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
              ${isTrack ? 'ON TRACK' : 'BEHIND'}
            </span>
          </div>

          <!-- Editable Description Box (Starts Empty) -->
          <textarea 
            onchange="updateDashboardPace('${p.id}', 'description', this.value)"
            placeholder="Add task description..."
            class="w-full text-xs text-slate-400 bg-slate-900/60 border border-slate-700/60 rounded p-1.5 focus:outline-none focus:border-indigo-500 resize-none h-14 mb-2">${p.description || ''}</textarea>

          <div class="text-2xl font-bold text-white mb-2">${pct}%</div>
          <div class="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div class="bg-indigo-500 h-full" style="width: ${Math.min(pct, 100)}%"></div>
          </div>
        </div>

        <div class="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-700/50">
          <span>Done: <strong class="text-slate-200">${totalDone}</strong></span>
          <div class="flex items-center gap-1">
            <span>Dues:</span>
            <!-- Editable Dues Box (Starts Empty visually if null) -->
            <input type="number" min="0" value="${p.dues !== null && p.dues !== undefined ? p.dues : ''}" placeholder="0"
              oninput="updateDashboardPace('${p.id}', 'dues', this.value)"
              class="w-14 bg-slate-900 border border-slate-700 rounded text-center py-0.5 text-xs text-indigo-300 font-bold focus:outline-none focus:border-indigo-500">
          </div>
        </div>
      </div>
    `;
  });
}

function updateDashboardPace(paceId, key, val) {
  const p = appState.paces.find(item => item.id === paceId);
  if (p) {
    p[key] = key === 'dues' ? (parseFloat(val) || null) : val;
    renderAll();
  }
}

/* --- PRIORITIZER 2026 CALENDAR LOGIC --- */
function navigateMonth(delta) {
  currentSelectedMonth += delta;
  if (currentSelectedMonth > 11) currentSelectedMonth = 11;
  if (currentSelectedMonth < 0) currentSelectedMonth = 0;
  document.getElementById('month-picker').value = currentSelectedMonth;
  renderPrioritizerGrid();
}

function changeMonth(mVal) {
  currentSelectedMonth = parseInt(mVal);
  renderPrioritizerGrid();
}

function renderPrioritizerGrid() {
  const thead = document.getElementById('pri-grid-header');
  const tbody = document.getElementById('pri-grid-body');
  const tfoot = document.getElementById('pri-grid-footer');

  thead.innerHTML = '<th class="py-2.5 px-3">Date (2026)</th>' + appState.tasks.map(t => `<th class="py-2.5 px-2 text-center">${t.name}</th>`).join('');

  const numDays = new Date(2026, currentSelectedMonth + 1, 0).getDate();
  tbody.innerHTML = '';
  
  const taskTotals = {};
  appState.tasks.forEach(t => taskTotals[t.id] = 0);

  for (let d = 1; d <= numDays; d++) {
    const monthStr = String(currentSelectedMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateKey = `2026-${monthStr}-${dayStr}`;

    let rowHtml = `<td class="py-1.5 px-3 font-mono font-semibold text-slate-300">${dateKey}</td>`;
    appState.tasks.forEach(t => {
      const val = (appState.prioritizerGrid[dateKey] && appState.prioritizerGrid[dateKey][t.id]) || null;
      taskTotals[t.id] += Number(val || 0);
      rowHtml += `
        <td class="p-1 text-center">
          <input type="number" min="0" value="${val !== null ? val : ''}" placeholder=""
            oninput="updatePrioritizerCell('${dateKey}', '${t.id}', this.value)"
            class="w-12 bg-slate-900 border border-slate-700 rounded text-center py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500">
        </td>`;
    });
    tbody.innerHTML += `<tr>${rowHtml}</tr>`;
  }

  tfoot.innerHTML = '<td class="py-2 px-3 text-slate-200">Month Total</td>' + 
    appState.tasks.map(t => `<td class="py-2 px-2 text-center text-indigo-400 font-bold">${taskTotals[t.id]}</td>`).join('');
}

function updatePrioritizerCell(dateKey, taskId, val) {
  if (!appState.prioritizerGrid[dateKey]) appState.prioritizerGrid[dateKey] = {};
  appState.prioritizerGrid[dateKey][taskId] = parseFloat(val) || null;
  renderAll();
}

/* --- SOURCES MATRIX LOGIC --- */
function renderSourcesGrid() {
  const thead = document.getElementById('src-grid-header');
  const tbody = document.getElementById('src-grid-body');
  const summaryBody = document.getElementById('sources-summary-body');

  thead.innerHTML = '<th class="py-2 px-3">Task Name</th>' + 
    appState.sources.map(s => `
      <th class="py-2 px-2 text-center">
        <input type="text" value="${s.name}" onchange="updateSetItem('sources', '${s.id}', 'name', this.value)"
          class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs text-emerald-400 font-semibold focus:outline-none focus:border-emerald-500 w-28">
      </th>
    `).join('') + '<th class="py-2 px-3 text-center">Row Sum</th>';

  const sourceTotals = {};
  appState.sources.forEach(s => sourceTotals[s.id] = 0);

  tbody.innerHTML = '';
  appState.tasks.forEach(t => {
    let rowSum = 0;
    let rowHtml = `
      <td class="py-1.5 px-3">
        <input type="text" value="${t.name}" onchange="updateSetItem('tasks', '${t.id}', 'name', this.value)"
          class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 w-44">
      </td>`;

    appState.sources.forEach(s => {
      const val = (appState.sourcesGrid[t.id] && appState.sourcesGrid[t.id][s.id]) || null;
      sourceTotals[s.id] += Number(val || 0);
      rowSum += Number(val || 0);
      rowHtml += `
        <td class="p-1 text-center">
          <input type="number" min="0" value="${val !== null ? val : ''}" placeholder=""
            oninput="updateSourceCell('${t.id}', '${s.id}', this.value)"
            class="w-12 bg-slate-900 border border-slate-700 rounded text-center py-1 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500">
        </td>`;
    });
    rowHtml += `<td class="py-2 px-3 text-center font-bold text-slate-200">${rowSum}</td>`;
    tbody.innerHTML += `<tr>${rowHtml}</tr>`;
  });

  summaryBody.innerHTML = '';
  appState.sources.forEach(s => {
    const done = sourceTotals[s.id];
    const dues = parseFloat(s.dues) || 0;
    const paceRatio = calculatePaceRatio(done, dues);
    const isTrack = paceRatio >= 1;
    const dailyTarget = dues > 0 ? Math.max(0, Math.ceil((dues - done) / 10)) : 0;

    summaryBody.innerHTML += `
      <tr>
        <td class="py-2 px-3 font-medium text-slate-200">${s.name}</td>
        <td class="py-2 px-3 text-center font-bold text-emerald-400">${done}</td>
        <td class="py-2 px-3 text-center">
          <input type="number" min="0" value="${s.dues !== null && s.dues !== undefined ? s.dues : ''}" placeholder="0" oninput="updateSetItem('sources', '${s.id}', 'dues', this.value)"
            class="w-16 bg-slate-900 border border-slate-700 rounded text-center py-0.5 text-xs text-indigo-300 font-bold focus:outline-none focus:border-indigo-500">
        </td>
        <td class="py-2 px-3 text-center font-semibold text-indigo-400">${Math.round(paceRatio * 100)}%</td>
        <td class="py-2 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isTrack ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
            ${isTrack ? 'ON TRACK' : 'BEHIND'}
          </span>
        </td>
        <td class="py-2 px-3 text-center text-slate-300">${dailyTarget}</td>
      </tr>
    `;
  });
}

function updateSourceCell(taskId, sourceId, val) {
  if (!appState.sourcesGrid[taskId]) appState.sourcesGrid[taskId] = {};
  appState.sourcesGrid[taskId][sourceId] = parseFloat(val) || null;
  renderAll();
}

/* --- NO-CODE SETTINGS LOGIC --- */
function renderSettings() {
  // Paces UI
  const pacesList = document.getElementById('settings-paces-list');
  pacesList.innerHTML = appState.paces.map(p => `
    <div class="flex flex-col md:flex-row gap-2 bg-slate-900/50 p-2 rounded border border-slate-700 items-center">
      <input type="text" value="${p.name}" onchange="updateSetItem('paces', '${p.id}', 'name', this.value)" placeholder="Pace Name" class="w-full md:w-1/3 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs">
      <button onclick="deleteItem('paces', '${p.id}')" class="p-1 text-rose-400 hover:text-rose-300 bg-slate-800 rounded ml-auto"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </div>
  `).join('');

  // Tasks UI
  const tasksList = document.getElementById('settings-tasks-list');
  tasksList.innerHTML = appState.tasks.map(t => `
    <div class="flex flex-col md:flex-row gap-2 bg-slate-900/50 p-2 rounded border border-slate-700 items-center">
      <input type="text" value="${t.name}" onchange="updateSetItem('tasks', '${t.id}', 'name', this.value)" placeholder="Task Name" class="w-full md:w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs">
      <select onchange="updateSetItem('tasks', '${t.id}', 'paceId', this.value)" class="w-full md:w-1/3 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-indigo-300">
        ${appState.paces.map(p => `<option value="${p.id}" ${t.paceId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
      </select>
      <button onclick="deleteItem('tasks', '${t.id}')" class="p-1 text-rose-400 hover:text-rose-300 bg-slate-800 rounded ml-auto"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </div>
  `).join('');

  // Sources UI
  const sourcesList = document.getElementById('settings-sources-list');
  sourcesList.innerHTML = appState.sources.map(s => `
    <div class="flex flex-col md:flex-row gap-2 bg-slate-900/50 p-2 rounded border border-slate-700 items-center">
      <input type="text" value="${s.name}" onchange="updateSetItem('sources', '${s.id}', 'name', this.value)" placeholder="Source Name" class="w-full md:w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs">
      <button onclick="deleteItem('sources', '${s.id}')" class="p-1 text-rose-400 hover:text-rose-300 bg-slate-800 rounded ml-auto"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </div>
  `).join('');
}

// Universal Updater
function updateSetItem(collection, id, key, val) {
  const item = appState[collection].find(i => i.id === id);
  if (item) {
    item[key] = key === 'dues' ? (parseFloat(val) || null) : val;
    renderAll();
  }
}

// Add Functions
function addPace() {
  appState.paces.push({ id: 'p_' + Date.now(), name: 'New Pace', description: '', dues: null });
  renderAll();
}
function addTask() {
  const fallbackPace = appState.paces.length > 0 ? appState.paces[0].id : null;
  appState.tasks.push({ id: 't_' + Date.now(), name: 'New Task', paceId: fallbackPace });
  renderAll();
}
function addSource() {
  appState.sources.push({ id: 's_' + Date.now(), name: 'New Source', dues: null });
  renderAll();
}

// Delete Function
function deleteItem(collection, id) {
  if(!confirm("Are you sure you want to delete this?")) return;
  
  appState[collection] = appState[collection].filter(i => i.id !== id);

  // If a Pace is deleted, cascade delete its Tasks
  if (collection === 'paces') {
    appState.tasks = appState.tasks.filter(t => t.paceId !== id);
  }
  renderAll();
}

// Export / Import
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "prioritizer_backup.json");
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function importData() {
  const fileInput = document.getElementById('import-file');
  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a file first!");
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      appState = JSON.parse(e.target.result);
      renderAll();
      alert("Data loaded successfully!");
      fileInput.value = ""; // Reset input
    } catch (err) {
      alert("Error parsing file. Make sure it is a valid JSON backup.");
    }
  };
  reader.readAsText(file);
}

/* Tab Switcher */
function switchTab(tabName) {
  ['dashboard', 'prioritizer', 'sources', 'settings'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
    document.getElementById(`nav-${t}`).classList.replace('text-indigo-400', 'text-slate-400');
  });
  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  document.getElementById(`nav-${tabName}`).classList.replace('text-slate-400', 'text-indigo-400');
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
