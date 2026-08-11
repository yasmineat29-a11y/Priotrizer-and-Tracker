let appState = null;
let currentSelectedMonth = new Date().getMonth(); // Default to current month (0-11)
let currentSelectedYear = 2026;

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

    const paceRatio = calculatePaceRatio(totalDone, p.dues);
    const pct = Math.round((totalDone / p.dues) * 100) || 0;
    const isTrack = paceRatio >= 1;

    container.innerHTML += `
      <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md flex flex-col justify-between space-y-3">
        <div>
          <div class="flex justify-between items-start mb-2">
            <span class="font-semibold text-slate-200 text-sm">${p.name}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isTrack ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
              ${isTrack ? 'ON TRACK' : 'BEHIND'}
            </span>
          </div>

          <!-- Editable Description Box -->
          <textarea 
            onchange="updatePaceDescription('${p.id}', this.value)"
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
            <!-- Editable Dues Count -->
            <input type="number" min="0" value="${p.dues}" 
              oninput="updatePaceDues('${p.id}', this.value)"
              class="w-14 bg-slate-900 border border-slate-700 rounded text-center py-0.5 text-xs text-indigo-300 font-bold focus:outline-none focus:border-indigo-500">
          </div>
        </div>
      </div>
    `;
  });
}

function updatePaceDescription(paceId, val) {
  const p = appState.paces.find(item => item.id === paceId);
  if (p) p.description = val;
}

function updatePaceDues(paceId, val) {
  const p = appState.paces.find(item => item.id === paceId);
  if (p) {
    p.dues = parseFloat(val) || 0;
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

  // Generate days for selected month in 2026
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
      const val = (appState.prioritizerGrid[dateKey] && appState.prioritizerGrid[dateKey][t.id]) || 0;
      taskTotals[t.id] += Number(val);
      rowHtml += `
        <td class="p-1 text-center">
          <input type="number" min="0" value="${val || ''}" placeholder="0"
            oninput="updatePrioritizerCell('${dateKey}', '${t.id}', this.value)"
            class="w-12 bg-slate-900 border border-slate-700 rounded text-center py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500">
        </td>`;
    });
    tbody.innerHTML += `<tr>${rowHtml}</tr>`;
  }

  // Footer Totals across the month
  tfoot.innerHTML = '<td class="py-2 px-3 text-slate-200">Month Total</td>' + 
    appState.tasks.map(t => `<td class="py-2 px-2 text-center text-indigo-400 font-bold">${taskTotals[t.id]}</td>`).join('');
}

function updatePrioritizerCell(dateKey, taskId, val) {
  if (!appState.prioritizerGrid[dateKey]) appState.prioritizerGrid[dateKey] = {};
  appState.prioritizerGrid[dateKey][taskId] = parseFloat(val) || 0;
  renderAll();
}

/* --- SOURCES MATRIX LOGIC --- */
function renderSourcesGrid() {
  const thead = document.getElementById('src-grid-header');
  const tbody = document.getElementById('src-grid-body');
  const summaryBody = document.getElementById('sources-summary-body');

  // Matrix Header with Editable Source Names
  thead.innerHTML = '<th class="py-2 px-3">Task Name</th>' + 
    appState.sources.map(s => `
      <th class="py-2 px-2 text-center">
        <input type="text" value="${s.name}" onchange="updateSourceName('${s.id}', this.value)"
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
        <input type="text" value="${t.name}" onchange="updateTaskName('${t.id}', this.value)"
          class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 w-44">
      </td>`;

    appState.sources.forEach(s => {
      const val = (appState.sourcesGrid[t.id] && appState.sourcesGrid[t.id][s.id]) || 0;
      sourceTotals[s.id] += Number(val);
      rowSum += Number(val);
      rowHtml += `
        <td class="p-1 text-center">
          <input type="number" min="0" value="${val || ''}" placeholder="0"
            oninput="updateSourceCell('${t.id}', '${s.id}', this.value)"
            class="w-12 bg-slate-900 border border-slate-700 rounded text-center py-1 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500">
        </td>`;
    });
    rowHtml += `<td class="py-2 px-3 text-center font-bold text-slate-200">${rowSum}</td>`;
    tbody.innerHTML += `<tr>${rowHtml}</tr>`;
  });

  // Sources Summary Table with Editable Dues
  summaryBody.innerHTML = '';
  appState.sources.forEach(s => {
    const done = sourceTotals[s.id];
    const paceRatio = calculatePaceRatio(done, s.dues);
    const isTrack = paceRatio >= 1;
    const dailyTarget = Math.max(0, Math.ceil((s.dues - done) / 10));

    summaryBody.innerHTML += `
      <tr>
        <td class="py-2 px-3 font-medium text-slate-200">${s.name}</td>
        <td class="py-2 px-3 text-center font-bold text-emerald-400">${done}</td>
        <td class="py-2 px-3 text-center">
          <input type="number" min="0" value="${s.dues}" oninput="updateSourceDues('${s.id}', this.value)"
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

function updateSourceName(sourceId, val) {
  const s = appState.sources.find(item => item.id === sourceId);
  if (s) s.name = val;
  renderAll();
}

function updateTaskName(taskId, val) {
  const t = appState.tasks.find(item => item.id === taskId);
  if (t) t.name = val;
  renderAll();
}

function updateSourceDues(sourceId, val) {
  const s = appState.sources.find(item => item.id === sourceId);
  if (s) {
    s.dues = parseFloat(val) || 0;
    renderAll();
  }
}

function updateSourceCell(taskId, sourceId, val) {
  if (!appState.sourcesGrid[taskId]) appState.sourcesGrid[taskId] = {};
  appState.sourcesGrid[taskId][sourceId] = parseFloat(val) || 0;
  renderAll();
}

/* Dynamic Row Addition (+) */
function addNewTaskRow(paceId) {
  const newId = 't_' + Date.now();
  const paceObj = appState.paces.find(p => p.id === paceId);
  const paceName = paceObj ? paceObj.name.toLowerCase() : 'pace';
  
  appState.tasks.push({
    id: newId,
    name: `new task of ${paceName}`,
    paceId: paceId
  });
  renderAll();
}

/* Tab Switcher */
function switchTab(tabName) {
  ['dashboard', 'prioritizer', 'sources'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
    document.getElementById(`nav-${t}`).classList.replace('text-indigo-400', 'text-slate-400');
  });
  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  document.getElementById(`nav-${tabName}`).classList.replace('text-slate-400', 'text-indigo-400');
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
