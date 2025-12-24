const API = "/api";
let token = localStorage.getItem("token");
let isAdmin = false;
let activeTournamentId = null;
let currentTeams = [];
let currentMatches = [];

function init() {
  if (token) {
    try {
      const p = JSON.parse(atob(token));
      if (p.isAdmin) {
        isAdmin = true;
        document.getElementById("loginBtn").classList.add("hidden");
        document.getElementById("logoutBtn").classList.remove("hidden");
        document
          .querySelectorAll(".btn-admin")
          .forEach((e) => e.classList.remove("hidden"));
      }
    } catch (e) {
      logout();
    }
  }
}

// --- NAVIGATION ---
function showMainMenu() {
  document.getElementById("players-manager").classList.add("hidden");
  document.getElementById("tournaments-section").classList.add("hidden");
  document.getElementById("main-menu").classList.remove("hidden");
}
function showTournaments() {
  document.getElementById("main-menu").classList.add("hidden");
  document.getElementById("tournaments-section").classList.remove("hidden");
  loadTournaments();
}
function togglePlayerMgr() {
  const el = document.getElementById("players-manager");
  const menu = document.getElementById("main-menu");
  if (el.classList.contains("hidden")) {
    menu.classList.add("hidden");
    el.classList.remove("hidden");
    loadAllPlayers();
  } else {
    el.classList.add("hidden");
    menu.classList.remove("hidden");
  }
}
function openCreateTournModal() {
  document.getElementById("create-tourn-modal").classList.remove("hidden");
}
function closeCreateTournModal() {
  document.getElementById("create-tourn-modal").classList.add("hidden");
}

// --- AUTH ---
function toggleLogin() {
  document.getElementById("login-modal").classList.toggle("hidden");
}
async function login() {
  const u = document.getElementById("uName").value;
  const p = document.getElementById("pWord").value;
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    location.reload();
  }
}
function logout() {
  localStorage.removeItem("token");
  location.reload();
}

// --- PLAYERS ---
async function loadAllPlayers() {
  const res = await fetch(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const players = await res.json();
  document.getElementById("all-players-list").innerHTML = players
    .map(
      (p) =>
        `<div style="padding:5px; border-bottom:1px solid #334155;">${p.name}</div>`
    )
    .join("");
}
async function createGlobalPlayer() {
  const name = document.getElementById("newGlobalPlayer").value;
  if (!name) return;
  await fetch(`${API}/players`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  document.getElementById("newGlobalPlayer").value = "";
  loadAllPlayers();
}

// --- TOURNAMENTS ---
async function loadTournaments() {
  const res = await fetch(`${API}/tournaments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const tourns = await res.json();
  const list = document.getElementById("tournament-list");
  list.innerHTML = "";
  tourns.forEach((t) => {
    let adminControls = "";
    if (isAdmin) {
      adminControls = `
        <div style="margin-top:10px; border-top:1px solid #334155; padding-top:5px; display:flex; gap:10px;">
          <span class="control-icon" onclick="event.stopPropagation(); deleteTournament('${t.id}')">🗑️ Delete</span>
          <span class="control-icon" onclick="event.stopPropagation(); editTournament('${t.id}')">✏️ Edit</span>
        </div>`;
    }
    const dates = t.start_date
      ? `<div style="font-size:12px; color:#94a3b8;">${t.start_date} to ${t.end_date}</div>`
      : "";

    const div = document.createElement("div");
    div.className = "card";
    div.style.cursor = "pointer";
    div.innerHTML = `<h3>${t.name}</h3>${dates}${adminControls}`;
    div.onclick = () => openTournament(t.id, t.name);
    list.appendChild(div);
  });
}

async function createTournament() {
  const name = document.getElementById("newTournName").value;
  const s = document.getElementById("newStartDate").value;
  const e = document.getElementById("newEndDate").value;
  await fetch(`${API}/tournaments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, startDate: s, endDate: e }),
  });
  closeCreateTournModal();
  loadTournaments();
}

async function deleteTournament(id) {
  if (!confirm("Delete tournament and all matches?")) return;
  await fetch(`${API}/tournaments`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });
  loadTournaments();
}

// --- INSIDE TOURNAMENT ---
async function openTournament(id, name) {
  activeTournamentId = id;
  document.getElementById("dashboard-view").classList.add("hidden");
  document.getElementById("tournament-view").classList.remove("hidden");
  document.getElementById("active-tourn-title").textContent = name;
  if (isAdmin) {
    document
      .getElementById("admin-fixtures-controls")
      .classList.remove("hidden");
    document.getElementById("admin-teams-controls").classList.remove("hidden");
  }
  await loadTeams();
  await loadMatches();
  calculateStandings(); // Update table initially
}

function closeTournament() {
  activeTournamentId = null;
  document.getElementById("dashboard-view").classList.remove("hidden");
  document.getElementById("tournament-view").classList.add("hidden");
}

function switchTab(tab) {
  document
    .querySelectorAll("[id^='tab-']")
    .forEach((e) => e.classList.add("hidden"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((e) => e.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.remove("hidden");
  document.getElementById(`btn-${tab}`).classList.add("active");
}

// --- FIXTURES ---
async function generateFixtures() {
  const r = document.getElementById("genRounds").value;
  if (!confirm(`Generate ${r} rounds?`)) return;
  await fetch(`${API}/fixtures`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tournamentId: activeTournamentId, rounds: r }),
  });
  document.getElementById("btnGen").disabled = true; // Gray out
  loadMatches();
}

async function clearFixtures() {
  if (!confirm("DELETE ALL MATCHES?")) return;
  await fetch(`${API}/fixtures`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tournamentId: activeTournamentId, action: "clear" }),
  });
  document.getElementById("btnGen").disabled = false;
  loadMatches();
}

async function loadMatches() {
  const res = await fetch(`${API}/matches?tournamentId=${activeTournamentId}`);
  currentMatches = await res.json();
  const list = document.getElementById("matches-list");
  list.innerHTML = "";

  if (currentMatches.length > 0)
    document.getElementById("btnGen").disabled = true;

  currentMatches.forEach((m, index) => {
    const isFinished = m.status === "finished";
    const highlight = isFinished ? "match-finished" : "";
    const scoreText = isFinished
      ? `<span style="font-weight:bold; color:#f8fafc;">${m.score_a} - ${m.score_b}</span>`
      : `<span style="color:#64748b;">vs</span>`;

    // Admin Move/Delete Controls
    let controls = "";
    if (isAdmin) {
      controls = `
        <div style="margin-left:auto; display:flex; gap:5px;">
           <span class="control-icon" onclick="event.stopPropagation(); moveMatch('${m.id}', ${m.match_order}, -1)">▲</span>
           <span class="control-icon" onclick="event.stopPropagation(); moveMatch('${m.id}', ${m.match_order}, 1)">▼</span>
           <span class="control-icon" onclick="event.stopPropagation(); deleteMatch('${m.id}')" style="color:#ef4444;">×</span>
        </div>`;
    }

    const div = document.createElement("div");
    div.className = `match-row ${highlight}`;
    div.innerHTML = `
      <div style="flex:1;">
        <div style="font-size:10px; color:#94a3b8;">Match ${index + 1}</div>
        <div style="display:flex; align-items:center; gap:10px; font-size:15px;">
           <span style="color:${getTeamColor(m.team_a_id)}">${
      m.team_a_name
    }</span>
           ${scoreText}
           <span style="color:${getTeamColor(m.team_b_id)}">${
      m.team_b_name
    }</span>
        </div>
      </div>
      ${controls}
    `;
    div.onclick = () => openMatchModal(m);
    list.appendChild(div);
  });

  calculateStandings(); // Re-calc table whenever matches change
}

async function moveMatch(id, currentOrder, direction) {
  // Swap logic simply changes order number
  const newOrder = currentOrder + direction * 1.5; // float hack to push it between
  await fetch(`${API}/matches`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ matchId: id, newOrder }),
  });
  loadMatches();
}

async function deleteMatch(id) {
  if (!confirm("Delete match?")) return;
  await fetch(`${API}/matches`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });
  loadMatches();
}

async function scheduleMatch() {
  const tA = document.getElementById("teamASelect").value;
  const tB = document.getElementById("teamBSelect").value;
  const d = document.getElementById("matchDate").value;
  await fetch(`${API}/matches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      teamAId: tA,
      teamBId: tB,
      startTime: d,
      tournamentId: activeTournamentId,
    }),
  });
  loadMatches();
}

// --- TEAMS ---
async function loadTeams() {
  const res = await fetch(`${API}/teams?tournamentId=${activeTournamentId}`);
  currentTeams = await res.json();
  // Populate dropdowns
  const sA = document.getElementById("teamASelect");
  const sB = document.getElementById("teamBSelect");
  sA.innerHTML = "<option>Select A</option>";
  sB.innerHTML = "<option>Select B</option>";
  currentTeams.forEach((t) => {
    sA.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    sB.innerHTML += `<option value="${t.id}">${t.name}</option>`;
  });

  // Render list
  const list = document.getElementById("teams-list");
  list.innerHTML = currentTeams
    .map(
      (t) =>
        `<div style="background:#1e293b; padding:10px; margin-bottom:5px; border-left:4px solid ${t.jersey_color};">${t.name}</div>`
    )
    .join("");
}

function getTeamColor(id) {
  const t = currentTeams.find((x) => x.id === id);
  return t ? t.jersey_color : "#fff";
}

async function addTeam() {
  const name = document.getElementById("newTeamName").value;
  const color = document.getElementById("newTeamColor").value;
  await fetch(`${API}/teams`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      tournamentId: activeTournamentId,
      jerseyColor: color,
    }),
  });
  loadTeams();
}

// --- STANDINGS CALCULATOR (Frontend) ---
function calculateStandings() {
  // Init stats
  const stats = {};
  currentTeams.forEach((t) => {
    stats[t.id] = { name: t.name, p: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0 };
  });

  currentMatches.forEach((m) => {
    if (m.status === "finished") {
      const sA = m.score_a;
      const sB = m.score_b;
      const idA = m.team_a_id;
      const idB = m.team_b_id;

      if (stats[idA] && stats[idB]) {
        stats[idA].p++;
        stats[idB].p++;
        stats[idA].gd += sA - sB;
        stats[idB].gd += sB - sA;

        if (sA > sB) {
          stats[idA].w++;
          stats[idA].pts += 3;
          stats[idB].l++;
        } else if (sB > sA) {
          stats[idB].w++;
          stats[idB].pts += 3;
          stats[idA].l++;
        } else {
          stats[idA].d++;
          stats[idA].pts += 1;
          stats[idB].d++;
          stats[idB].pts += 1;
        }
      }
    }
  });

  // Sort: Points -> GD -> Wins
  const sorted = Object.values(stats).sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.w - a.w
  );

  // Render
  const body = document.getElementById("league-body");
  body.innerHTML = sorted
    .map(
      (t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td style="font-weight:bold; color:white;">${t.name}</td>
      <td>${t.p}</td>
      <td>${t.w}</td>
      <td>${t.d}</td>
      <td>${t.l}</td>
      <td>${t.gd > 0 ? "+" + t.gd : t.gd}</td>
      <td style="font-weight:bold; color:#facc15;">${t.pts}</td>
    </tr>
  `
    )
    .join("");
}

// --- MATCH MODAL (Reuse logic) ---
function openMatchModal(m) {
  // Same logic as before but updated for new structure
  // ... (Paste your previous openMatchModal code here or keep simple)
  // For brevity, using simple alert for now unless you want full detail again
  document.getElementById("match-modal").classList.remove("hidden");
  // (We can re-add the detailed editor here if needed, keeping it simple for this step)
  document.getElementById("match-modal-content").innerHTML = `
    <h3 style="text-align:center;">${m.team_a_name} vs ${m.team_b_name}</h3>
    ${
      isAdmin
        ? `<input id="scA" type="number" value="${
            m.score_a || 0
          }"> - <input id="scB" type="number" value="${
            m.score_b || 0
          }"> <button onclick="saveScore('${m.id}')">Save</button>`
        : `<h1 style="text-align:center">${m.score_a || 0} - ${
            m.score_b || 0
          }</h1>`
    }
  `;
}
function closeMatchModal() {
  document.getElementById("match-modal").classList.add("hidden");
}
async function saveScore(id) {
  const sA = document.getElementById("scA").value;
  const sB = document.getElementById("scB").value;
  await fetch(`${API}/matches`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ matchId: id, scoreA: sA, scoreB: sB }),
  });
  closeMatchModal();
  loadMatches();
}

init();
