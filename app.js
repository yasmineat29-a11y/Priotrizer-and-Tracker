// Calculate dynamic workdays equivalent to NETWORKDAYS formula
function calculatePace(done, dues) {
  if (!dues || dues === 0) return 0;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();

  const elapsedRatio = currentDay / totalDays;
  const completionRatio = done / dues;
  return elapsedRatio > 0 ? (completionRatio / elapsedRatio) : 0;
}

let store = {
  dashboard: [
    { pace: "Tasks of Pace 1", apr: 0.40, may: 0.60, done: 5, dues: 28 },
    { pace: "Tasks of Pace 2", apr: 0.42, may: 0.50, done: 17, dues: 80 },
    { pace: "Tasks of Pace 4", apr: 0.50, may: 0.76, done: 3, dues: 17 },
    { pace: "Tasks of Pace 5", apr: 0.90, may: 0.63, done: 0, dues: 10 }
  ],
  sources: [
    { name: "Source 1", done: 0, dues: 0 },
    { name: "Source 2", done: 0, dues: 0 },
    { name: "Source 3", done: 4, dues: 24 },
    { name: "Source 4", done: 2, dues: 24 },
    { name: "Source 5", done: 3, dues: 24 }
  ]
};

function renderDashboard() {
  const container = document.getElementById("pace-cards");
  const trendBody = document.getElementById("dashboard-trend-body");
  container.innerHTML = "";
  trendBody.innerHTML = "";

  store.dashboard.forEach(item => {
    const currentPaceVal = calculatePace(item.done, item.dues);
    const pct = Math.round((item.done / item.dues) * 100) || 0;
    const isTrack = currentPaceVal >= 1;

    // Mobile Card
    container.innerHTML += `
      <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
        <div class="flex justify-between items-start mb-2">
          <span class="font-semibold text-slate-200">${item.pace}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isTrack ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
            ${isTrack ? 'ON TRACK' : 'BEHIND'}
          </span>
        </div>
        <div class="text-2xl font-bold text-white mb-2">${pct}%</div>
        <div class="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
          <div class="bg-indigo-500 h-full" style="width: ${Math.min(pct, 100)}%"></div>
        </div>
        <div class="flex justify-between text-xs text-slate-400 mt-2">
          <span>Done: ${item.done}</span>
          <span>Dues: ${item.dues}</span>
        </div>
      </div>
    `;

    // Trend Row
    trendBody.innerHTML += `
      <tr>
        <td class="py-2 px-3 text-slate-200">${item.pace}</td>
        <td class="py-2 px-3 text-right text-slate-400">${Math.round(item.apr * 100)}%</td>
        <td class="py-2 px-3 text-right text-slate-400">${Math.round(item.may * 100)}%</td>
        <td class="py-2 px-3 text-right font-semibold text-indigo-400">${pct}%</td>
      </tr>
    `;
  });
}

function renderSources() {
  const list = document.getElementById("sources-list");
  list.innerHTML = "";
  store.sources.forEach(src => {
    const paceVal = calculatePace(src.done, src.dues);
    const isTrack = paceVal >= 1;
    const dailyTarget = Math.max(0, Math.ceil((src.dues - src.done) / 10));

    list.innerHTML += `
      <tr>
        <td class="py-2 px-3 font-medium text-slate-200">${src.name}</td>
        <td class="py-2 px-3 text-center text-slate-300">${src.done}</td>
        <td class="py-2 px-3 text-center text-slate-300">${src.dues}</td>
        <td class="py-2 px-3 text-center text-indigo-400">${Math.round(paceVal * 100)}%</td>
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

function switchTab(tabName) {
  ['dashboard', 'prioritizer', 'sources'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
    document.getElementById(`nav-${t}`).classList.replace('text-indigo-400', 'text-slate-400');
  });
  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  document.getElementById(`nav-${tabName}`).classList.replace('text-slate-400', 'text-indigo-400');
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("current-date").textContent = new Date().toISOString().split('T')[0];
  renderDashboard();
  renderSources();
  lucide.createIcons();
});
