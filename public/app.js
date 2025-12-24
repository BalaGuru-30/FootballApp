const API = "/api";
let token = localStorage.getItem("token");
let isAdmin = false;
let activeTournamentId = null;
let activeTournamentDate = null;
let allTournaments = [];
let currentTeams = [];

function init() {
  if (token) {
    try {
      const p = JSON.parse(atob(token));
      if (p.isAdmin) {
        isAdmin = true;
        document.getElementById("loginBtn").classList.add("hidden");
        document.getElementById("logoutBtn").classList.remove("hidden");
        document.getElementById("fab-add-tourn").classList.remove("hidden");
        document
          .getElementById("admin-player-controls")
          .classList.remove("hidden");
      }
    } catch (e) {
      logout();
    }
  }
  loadTournaments();
}

// --- UI HELPERS ---
function showSection(id, tabEl) {
  document.getElementById("section-tournaments").classList.add("hidden");
  document.getElementById("section-players").classList.add("hidden");
  document.getElementById(`section-${id}`).classList.remove("hidden");
  document
    .querySelectorAll("#view-dashboard .tab")
    .forEach((t) => t.classList.remove("active"));
  tabEl.classList.add("active");
  if (id === "players") loadAllPlayers();
}

function openModal(id) {
  document.getElementById(`modal-${id}`).classList.remove("hidden");
}
function closeModal(e, id) {
  if (e.target === e.currentTarget)
    document.getElementById(`modal-${id}`).classList.add("hidden");
}
function forceCloseModal(id) {
  document.getElementById(`modal-${id}`).classList.add("hidden");
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

// --- TOURNAMENTS ---
async function loadTournaments() {
  const res = await fetch(`${API}/tournaments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  allTournaments = await res.json();
  renderTournaments(allTournaments);
}

function renderTournaments(list) {
  const container = document.getElementById("tournament-list");
  container.innerHTML = "";
  list.forEach((t) => {
    let adminBtn = isAdmin
      ? `<div style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px; display:flex; justify-content:flex-end; gap:15px;">
           <span style="cursor:pointer; font-size:13px;" onclick="event.stopPropagation(); prepareEditTourn('${t.id}')">✏️ Edit</span>
           <span style="cursor:pointer; color:var(--danger); font-size:13px;" onclick="event.stopPropagation(); deleteTournament('${t.id}')">🗑 Delete</span>
        </div>`
      : "";

    const div = document.createElement("div");
    div.className = "card";
    div.onclick = () => openTournament(t.id, t.name, t.tournament_date);
    div.innerHTML = `<div style="font-weight:bold; font-size:16px;">${
      t.name
    }</div><div style="font-size:12px; color:#94a3b8; margin-top:4px;">${
      t.tournament_date || "No Date"
    }</div>${adminBtn}`;
    container.appendChild(div);
  });
}

function filterTournaments() {
  const search = document.getElementById("searchTourn").value.toLowerCase();
  const date = document.getElementById("filterDate").value;
  const filtered = allTournaments.filter(
    (t) =>
      t.name.toLowerCase().includes(search) &&
      (!date || t.tournament_date === date)
  );
  renderTournaments(filtered);
}
function clearFilters() {
  document.getElementById("searchTourn").value = "";
  document.getElementById("filterDate").value = "";
  renderTournaments(allTournaments);
}

async function createTournament() {
  const name = document.getElementById("newTournName").value;
  const date = document.getElementById("newTournDate").value;
  await fetch(`${API}/tournaments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, date }),
  });
  forceCloseModal("create-tourn");
  loadTournaments();
}

async function deleteTournament(id) {
  if (!confirm("Delete this tournament?")) return;
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

function prepareEditTourn(id) {
  const t = allTournaments.find((x) => x.id === id);
  document.getElementById("editTournId").value = id;
  document.getElementById("editTournName").value = t.name;
  document.getElementById("editTournDate").value = t.tournament_date;
  openModal("edit-tourn");
}

async function updateTournament() {
  const id = document.getElementById("editTournId").value;
  const name = document.getElementById("editTournName").value;
  const date = document.getElementById("editTournDate").value;
  await fetch(`${API}/tournaments`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, name, date }),
  });
  forceCloseModal("edit-tourn");
  loadTournaments();
}

// --- GLOBAL PLAYERS ---
async function loadAllPlayers() {
  const res = await fetch(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const players = await res.json();
  const list = document.getElementById("all-players-list");
  list.innerHTML = "";
  players.forEach((p) => {
    const delBtn = isAdmin
      ? `<span onclick="deleteGlobalPlayer('${p.id}')" style="color:var(--danger); cursor:pointer;">×</span>`
      : "";
    list.innerHTML += `<div class="card" style="padding:10px; display:flex; justify-content:space-between;"><span>${p.name}</span>${delBtn}</div>`;
  });
  return players; // Return for picker
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
async function deleteGlobalPlayer(id) {
  if (!confirm("Delete?")) return;
  await fetch(`${API}/players`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });
  loadAllPlayers();
}

// --- INSIDE TOURNAMENT ---
async function openTournament(id, name, date) {
  activeTournamentId = id;
  activeTournamentDate = date;
  document.getElementById("view-dashboard").classList.add("hidden");
  document.getElementById("view-tournament").classList.remove("hidden");
  document.getElementById("active-tourn-title").textContent = name;
  if (isAdmin) {
    document
      .getElementById("admin-fixtures-controls")
      .classList.remove("hidden");
    document.getElementById("admin-teams-controls").classList.remove("hidden");
  }
  await loadTeams();
  await loadMatches();
}

function closeTournament() {
  activeTournamentId = null;
  document.getElementById("view-dashboard").classList.remove("hidden");
  document.getElementById("view-tournament").classList.add("hidden");
}

function switchTab(tab, el) {
  document
    .querySelectorAll("#view-tournament .tab")
    .forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  ["standings", "fixtures", "teams"].forEach((t) =>
    document.getElementById(`tab-${t}`).classList.add("hidden")
  );
  document.getElementById(`tab-${tab}`).classList.remove("hidden");
}

// --- TEAMS ---
async function loadTeams() {
  const res = await fetch(`${API}/teams?tournamentId=${activeTournamentId}`);
  currentTeams = await res.json();
  const list = document.getElementById("teams-list");
  list.innerHTML = "";

  // Populate Match Selects
  const sA = document.getElementById("teamASelect");
  const sB = document.getElementById("teamBSelect");
  sA.innerHTML = "<option value=''>Team A</option>";
  sB.innerHTML = "<option value=''>Team B</option>";
  currentTeams.forEach((t) => {
    const opt = `<option value="${t.id}">${t.name}</option>`;
    sA.innerHTML += opt;
    sB.innerHTML += opt;
  });

  currentTeams.forEach((t) => {
    const pNames = t.team_players.map((tp) => tp.players.name).join(", ");
    const adminControls = isAdmin
      ? `
       <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:8px; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
          <button class="btn-sm btn-primary" onclick="openPlayerPicker('${t.id}')">+ Player</button>
          <div>
            <span class="btn-icon" style="font-size:14px;" onclick="renameTeam('${t.id}')">✏️</span>
            <span class="btn-icon" style="color:var(--danger); font-size:14px;" onclick="deleteTeam('${t.id}')">🗑</span>
          </div>
       </div>`
      : "";

    list.innerHTML += `<div class="card" style="border-left:5px solid ${
      t.jersey_color
    };">
       <div style="font-weight:bold;">${t.name}</div>
       <div style="font-size:12px; color:#94a3b8; margin-top:5px;">${
         pNames || "No players"
       }</div>
       ${adminControls}
     </div>`;
  });
}

async function addTeam() {
  const name = document.getElementById("newTeamName").value;
  const color = document.getElementById("newTeamColor").value;
  if (!name) return;
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
async function deleteTeam(id) {
  if (!confirm("Delete Team?")) return;
  await fetch(`${API}/teams`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });
  loadTeams();
}
async function renameTeam(id) {
  const n = prompt("New Name:");
  if (n) {
    await fetch(`${API}/teams`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "rename", teamId: id, name: n }),
    });
    loadTeams();
  }
}

// --- PLAYER PICKER LOGIC ---
async function openPlayerPicker(teamId) {
  document.getElementById("targetTeamId").value = teamId;
  const players = await loadAllPlayers();
  const sel = document.getElementById("globalPlayerSelect");
  sel.innerHTML = players
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");
  openModal("pick-player");
}

async function addSelectedPlayer() {
  const teamId = document.getElementById("targetTeamId").value;
  const playerId = document.getElementById("globalPlayerSelect").value;
  await linkPlayer(teamId, playerId);
}

async function quickCreateAndAdd() {
  const name = document.getElementById("quickPlayerName").value;
  if (!name) return;
  const res = await fetch(`${API}/players`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  const newP = await res.json();
  await linkPlayer(document.getElementById("targetTeamId").value, newP.id);
  document.getElementById("quickPlayerName").value = "";
}

async function linkPlayer(teamId, playerId) {
  await fetch(`${API}/teams`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "add_player", teamId, playerId }),
  });
  forceCloseModal("pick-player");
  loadTeams();
}

// --- MATCHES ---
async function generateFixtures() {
  if (!confirm("Generate matches?")) return;
  const r = document.getElementById("genRounds").value;
  await fetch(`${API}/fixtures`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tournamentId: activeTournamentId, rounds: r }),
  });
  loadMatches();
}
async function clearFixtures() {
  if (!confirm("Clear all matches?")) return;
  await fetch(`${API}/fixtures`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tournamentId: activeTournamentId, action: "clear" }),
  });
  loadMatches();
}
async function scheduleMatch() {
  const tA = document.getElementById("teamASelect").value;
  const tB = document.getElementById("teamBSelect").value;
  const d = document.getElementById("matchDate").value || activeTournamentDate; // Default to tourn date
  const type = document.getElementById("matchTypeSelect").value;
  if (!tA || !tB) return alert("Select teams");
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
      matchType: type,
    }),
  });
  loadMatches();
}

async function loadMatches() {
  const res = await fetch(`${API}/matches?tournamentId=${activeTournamentId}`);
  currentMatches = await res.json();
  const list = document.getElementById("matches-list");
  list.innerHTML = "";

  if (isAdmin) {
    document.getElementById("btnGen").disabled = currentMatches.length > 0;
    document.getElementById("matchDate").value = activeTournamentDate; // Auto-fill date
  }

  currentMatches.forEach((m) => {
    const tA = currentTeams.find((t) => t.id === m.team_a_id);
    const tB = currentTeams.find((t) => t.id === m.team_b_id);
    const cA = tA ? tA.jersey_color : "#fff";
    const cB = tB ? tB.jersey_color : "#fff";
    const isFinal = m.match_type === "final";
    const score =
      m.status === "finished" ? `${m.score_a} - ${m.score_b}` : "VS";

    let reorderUI = isAdmin
      ? `
       <div class="reorder-controls">
         <div class="reorder-btn" onclick="moveMatch(event, '${m.id}', ${m.match_order}, -1)">▲</div>
         <div class="reorder-btn" onclick="moveMatch(event, '${m.id}', ${m.match_order}, 1)">▼</div>
       </div>`
      : "";

    let delBtn = isAdmin
      ? `<span style="color:var(--danger); cursor:pointer;" onclick="deleteMatch(event, '${m.id}')">🗑</span>`
      : "";

    const div = document.createElement("div");
    div.className = `match-card ${isFinal ? "final-match" : ""}`;
    div.style.flexDirection = "row";
    div.onclick = (e) => {
      if (
        !e.target.closest(".reorder-controls") &&
        !e.target.closest(".delete-btn")
      )
        openMatchModal(m, tA, tB);
    };

    div.innerHTML = `
       <div style="flex:1;">
         <div class="match-header"><span>${
           isFinal ? "🏆 FINAL" : "Match " + Math.round(m.match_order)
         }</span> ${delBtn}</div>
         <div class="match-body">
           <div class="team-info"><div style="width:10px; height:10px; border-radius:50%; background:${cA}; box-shadow:0 0 5px ${cA};"></div><span style="font-weight:600; font-size:13px;">${
      m.team_a_name
    }</span></div>
           <div class="score-badge">${score}</div>
           <div class="team-info" style="justify-content:flex-end;"><span style="font-weight:600; font-size:13px; text-align:right;">${
             m.team_b_name
           }</span><div style="width:10px; height:10px; border-radius:50%; background:${cB}; box-shadow:0 0 5px ${cB};"></div></div>
         </div>
       </div>
       ${reorderUI}
     `;
    list.appendChild(div);
  });
  calcStandings();
}

async function moveMatch(e, id, order, dir) {
  e.stopPropagation();
  const newOrder = order + dir * 1.5;
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

async function deleteMatch(e, id) {
  e.stopPropagation();
  if (!confirm("Delete?")) return;
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

// ... (Rest of logic: calcStandings, openMatchModal, saveScore - same as previous) ...
function calcStandings() {
  const stats = {};
  currentTeams.forEach(
    (t) =>
      (stats[t.id] = {
        name: t.name,
        p: 0,
        w: 0,
        d: 0,
        l: 0,
        gd: 0,
        pts: 0,
        color: t.jersey_color,
      })
  );
  currentMatches.forEach((m) => {
    if (m.status === "finished") {
      const a = m.team_a_id,
        b = m.team_b_id;
      if (stats[a] && stats[b]) {
        stats[a].p++;
        stats[b].p++;
        stats[a].gd += m.score_a - m.score_b;
        stats[b].gd += m.score_b - m.score_a;
        if (m.score_a > m.score_b) {
          stats[a].w++;
          stats[a].pts += 3;
          stats[b].l++;
        } else if (m.score_b > m.score_a) {
          stats[b].w++;
          stats[b].pts += 3;
          stats[a].l++;
        } else {
          stats[a].d++;
          stats[a].pts++;
          stats[b].d++;
          stats[b].pts++;
        }
      }
    }
  });
  const sorted = Object.values(stats).sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd
  );
  document.getElementById("league-body").innerHTML = sorted
    .map(
      (t, i) =>
        `<tr><td style="padding-left:16px; color:#94a3b8;">${
          i + 1
        }</td><td><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${
          t.color
        }; margin-right:6px;"></span>${t.name}</td><td>${t.p}</td><td>${
          t.w
        }</td><td>${t.d}</td><td>${t.l}</td><td>${
          t.gd > 0 ? "+" + t.gd : t.gd
        }</td><td style="padding-right:16px; font-weight:bold; color:var(--success); text-align:right;">${
          t.pts
        }</td></tr>`
    )
    .join("");
}

function openMatchModal(m, tA, tB) {
  openModal("match");
  const cA = tA ? tA.jersey_color : "#fff";
  const cB = tB ? tB.jersey_color : "#fff";
  const adminUI = isAdmin
    ? `<div style="display:flex; justify-content:center; gap:10px; margin-top:20px;"><input id="scoreA" type="number" value="${
        m.score_a || 0
      }" style="width:60px; font-size:20px; text-align:center;"><span style="font-size:20px; align-self:center;">-</span><input id="scoreB" type="number" value="${
        m.score_b || 0
      }" style="width:60px; font-size:20px; text-align:center;"></div><button class="btn btn-primary" onclick="saveScore('${
        m.id
      }')" style="margin-top:15px;">Update Score</button>`
    : "";
  document.getElementById(
    "match-modal-content"
  ).innerHTML = `<div style="text-align:center;"><div style="font-size:12px; margin-bottom:10px;">${
    m.match_type === "final" ? "🏆 GRAND FINAL" : "Match Details"
  }</div><div style="display:flex; justify-content:center; align-items:center; gap:20px;"><div style="text-align:center;"><div style="width:40px; height:40px; background:${cA}; border-radius:50%; margin:0 auto 5px auto; box-shadow:0 0 10px ${cA};"></div><div style="font-weight:bold;">${
    m.team_a_name
  }</div></div><div style="font-size:30px; font-weight:800;">${
    m.status === "finished" ? m.score_a + "-" + m.score_b : "VS"
  }</div><div style="text-align:center;"><div style="width:40px; height:40px; background:${cB}; border-radius:50%; margin:0 auto 5px auto; box-shadow:0 0 10px ${cB};"></div><div style="font-weight:bold;">${
    m.team_b_name
  }</div></div></div>${adminUI}</div>`;
}

async function saveScore(id) {
  const sa = document.getElementById("scoreA").value;
  const sb = document.getElementById("scoreB").value;
  await fetch(`${API}/matches`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ matchId: id, scoreA: sa, scoreB: sb }),
  });
  forceCloseModal("match");
  loadMatches();
}

init();
