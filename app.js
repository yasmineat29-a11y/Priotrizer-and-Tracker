let appState = null;

async function initApp() {
  const res = await fetch('data.json');
  appState = await res.json();
  document.getElementById('live-date').textContent = new Date().toISOString().split('T')[0];
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
  renderPrioritizerGrid();
  renderSourcesGrid();
  renderDashboard();
}

function renderPrioritizerGrid() {
  const thead = document.getElementById('pri-grid-header');
  const tbody = document.getElementById('pri-grid-body');
  const tfoot = document.getElementById('pri-grid-footer');

  thead.innerHTML = '<th class="py-2 px-3">Date</th>' + appState.tasks.map(t => `<th class="py-2 px-2 text-center">${t.name}</th>`).join('');

  // Rows
  tbody.innerHTML = '';
  const taskTotals = {};
  appState.tasks.forEach(t => taskTotals[t.id] = 0);

  Object.keys(appState.prioritizerGrid).forEach(dateStr => {
    let rowHtml = `<td class="py-2 px-3 font-mono font-semibold text-slate-300">${dateStr}</td>`;
    appState.tasks.forEach(t => {
      const val = appState.prioritizerGrid[dateStr][t.id] || 0;
      taskTotals[t.id] += Number(val);
      rowHtml += `
        <td class="p-1 text-center">
          <input type="number" min="0" value="${val || ''}" placeholder="0"
            oninput="updatePrioritizerCell('${dateStr}', '${t.id}', this.value)"
            class="w-12 bg-slate-900 border border-slate-700 rounded text-center py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500">
        </td>`;
    });
    tbody.innerHTML += `<tr>${rowHtml}</tr>`;
  });

  // Footer Totals
  tfoot.innerHTML = '<td class="py-2 px-3 text-slate-200">Total Progress</td>' + 
    appState.tasks.map(t => `<td class="py-2 px-2 text-center text-indigo-400 font-bold">${taskTotals[t.id]}</td>`).join('');
}

function updatePrioritizerCell(dateStr, taskId, val) {
  if (!appState.prioritizerGrid[dateStr]) appState.prioritizerGrid[dateStr] = {};
  appState.prioritizerGrid[dateStr][taskId] = parseFloat(val) || 0;
  renderAll();
}

function renderSourcesGrid() {
  const thead = document.getElementById('src-grid-header');
  const tbody = document.getElementById('src-grid-body');
  const summaryBody = document.getElementById('sources-summary-body');

  thead.innerHTML = '<th class="py-2 px-3">Task Name</th>' + 
    appState.sources.map(s => `<th class="py-2 px-2 text-center">${s.name}</th>`).join('') + '<th class="py-2 px-3 text-center">Row Sum</th>';

  const sourceTotals = {};
  appState.sources.forEach(s => sourceTotals[s.id] = 0);

  tbody.innerHTML = '';
  appState.tasks.forEach(t => {
    let rowSum = 0;
    let rowHtml = `<td class="py-2 px-3 font-semibold text-slate-300">${t.name}</td>`;
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

  // Summary Table
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
        <td class="py-2 px-3 text-center text-slate-400">${s.dues}</td>
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
  appState.sourcesGrid[taskId][sourceId] = parseFloat(val) || 0;
  renderAll();
}

function renderDashboard() {
  const container = document.getElementById('dashboard-cards');
  container.innerHTML = '';

  appState.paces.forEach(p => {
    let totalDone = 0;
    p.cols.forEach(tid => {
      Object.keys(appState.prioritizerGrid).forEach(d => {
        totalDone += Number(appState.prioritizerGrid[d][tid] || 0);
      });
    });

    const paceRatio = calculatePaceRatio(totalDone, p.dues);
    const pct = Math.round((totalDone / p.dues) * 100) || 0;
    const isTrack = paceRatio >= 1;

    container.innerHTML += `
      <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
        <div class="flex justify-between items-start mb-2">
          <span class="font-semibold text-slate-200">${p.name}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isTrack ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
            ${isTrack ? 'ON TRACK' : 'BEHIND'}
          </span>
        </div>
        <div class="text-2xl font-bold text-white mb-2">${pct}%</div>
        <div class="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
          <div class="bg-indigo-500 h-full" style="width: ${Math.min(pct, 100)}%"></div>
        </div>
        <div class="flex justify-between text-xs text-slate-400 mt-2">
          <span>Done: ${totalDone}</span>
          <span>Dues: ${p.dues}</span>
        </div>
      </div>
    `;
  });
}

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
  lucide.createIcons();
});
