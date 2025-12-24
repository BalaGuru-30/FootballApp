const API = "/api";
let token = localStorage.getItem("token");
let isAdmin = false;
let activeTournamentId = null;
let allTournaments = [];
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
          .getElementById("admin-add-tourn-btn")
          .classList.remove("hidden");
        document
          .getElementById("admin-player-controls")
          .classList.remove("hidden");
      }
    } catch (e) {
      logout();
    }
  } else {
    document.getElementById("player-error-msg").classList.remove("hidden");
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
  } else alert("Failed");
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
  if (list.length === 0) {
    container.innerHTML =
      "<div class='text-sm' style='text-align:center; padding:20px;'>No tournaments found</div>";
    return;
  }

  list.forEach((t) => {
    let adminBtn = "";
    if (isAdmin) {
      adminBtn = `
        <div style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px; display:flex; justify-content:flex-end; gap:10px;">
           <span class="text-sm" style="cursor:pointer;" onclick="event.stopPropagation(); prepareEditTourn('${t.id}')">✏️ Edit</span>
           <span class="text-sm" style="cursor:pointer; color:var(--danger);" onclick="event.stopPropagation(); deleteTournament('${t.id}')">🗑 Delete</span>
        </div>`;
    }
    const div = document.createElement("div");
    div.className = "card";
    div.onclick = () => openTournament(t.id, t.name);
    div.innerHTML = `
      <div style="font-weight:bold; font-size:16px; margin-bottom:4px;">${
        t.name
      }</div>
      <div class="text-sm">${t.start_date || "TBD"} &mdash; ${
      t.end_date || "TBD"
    }</div>
      ${adminBtn}
    `;
    container.appendChild(div);
  });
}

function filterTournaments() {
  const search = document.getElementById("searchTourn").value.toLowerCase();
  const date = document.getElementById("filterDate").value;
  const filtered = allTournaments.filter((t) => {
    const matchesName = t.name.toLowerCase().includes(search);
    const matchesDate = date ? t.start_date === date : true;
    return matchesName && matchesDate;
  });
  renderTournaments(filtered);
}

function clearFilters() {
  document.getElementById("searchTourn").value = "";
  document.getElementById("filterDate").value = "";
  renderTournaments(allTournaments);
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
  forceCloseModal("create-tourn");
  loadTournaments();
}

async function deleteTournament(id) {
  if (!confirm("Are you sure? This deletes all matches and teams!")) return;
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
  document.getElementById("editStartDate").value = t.start_date;
  document.getElementById("editEndDate").value = t.end_date;
  openModal("edit-tourn");
}

async function updateTournament() {
  const id = document.getElementById("editTournId").value;
  const name = document.getElementById("editTournName").value;
  const s = document.getElementById("editStartDate").value;
  const e = document.getElementById("editEndDate").value;
  await fetch(`${API}/tournaments`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, name, startDate: s, endDate: e }),
  });
  forceCloseModal("edit-tourn");
  loadTournaments();
}

// --- PLAYERS ---
async function loadAllPlayers() {
  const res = await fetch(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const players = await res.json();
  const list = document.getElementById("all-players-list");
  list.innerHTML = "";
  players.forEach((p) => {
    const delBtn = isAdmin
      ? `<button onclick="deleteGlobalPlayer('${p.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer;">×</button>`
      : "";
    list.innerHTML += `<div class="card" style="padding:10px; display:flex; justify-content:space-between; align-items:center;"><span>${p.name}</span>${delBtn}</div>`;
  });
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
  if (!confirm("Delete player?")) return;
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
async function openTournament(id, name) {
  activeTournamentId = id;
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
  document.getElementById("tab-standings").classList.add("hidden");
  document.getElementById("tab-fixtures").classList.add("hidden");
  document.getElementById("tab-teams").classList.add("hidden");
  document.getElementById(`tab-${tab}`).classList.remove("hidden");
}

// --- TEAMS ---
async function loadTeams() {
  const res = await fetch(`${API}/teams?tournamentId=${activeTournamentId}`);
  currentTeams = await res.json();
  const list = document.getElementById("teams-list");
  list.innerHTML = "";
  const sA = document.getElementById("teamASelect");
  const sB = document.getElementById("teamBSelect");
  sA.innerHTML = "<option value=''>Team A</option>";
  sB.innerHTML = "<option value=''>Team B</option>";

  currentTeams.forEach((t) => {
    sA.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    sB.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    const players = t.team_players.map((tp) => tp.players.name).join(", ");
    const adminActions = isAdmin
      ? `<div class="match-controls"><span class="text-sm" style="cursor:pointer; color:var(--primary);" onclick="addPlayerToTeam('${t.id}')">+ Add Player</span><span class="text-sm" style="cursor:pointer;" onclick="renameTeam('${t.id}')">Rename</span></div>`
      : "";
    list.innerHTML += `<div class="card" style="border-left: 5px solid ${
      t.jersey_color
    };"><div style="font-weight:bold; font-size:16px;">${
      t.name
    }</div><div class="text-sm" style="margin-top:5px; color:#94a3b8;">${
      players || "No players"
    }</div>${adminActions}</div>`;
  });
}

async function addTeam() {
  const name = document.getElementById("newTeamName").value;
  const color = document.getElementById("newTeamColor").value;
  if (!name) return alert("Name needed");
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

async function addPlayerToTeam(teamId) {
  const pName = prompt("Enter Player Name (Must exist in Global List first):");
  if (!pName) return;
  const allP = await (await fetch(`${API}/players`)).json();
  const player = allP.find((p) => p.name.toLowerCase() === pName.toLowerCase());
  if (player) {
    await fetch(`${API}/teams`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "add_player",
        teamId,
        playerId: player.id,
      }),
    });
    loadTeams();
  } else {
    alert("Player not found in Global List.");
  }
}

async function renameTeam(teamId) {
  const newName = prompt("New Name:");
  if (newName) {
    await fetch(`${API}/teams`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "rename", teamId, name: newName }),
    });
    loadTeams();
  }
}

// --- MATCHES ---
async function generateFixtures() {
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
  const d = document.getElementById("matchDate").value;
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

  if (isAdmin && currentMatches.length > 0) {
    document.getElementById("btnGen").disabled = true;
    document.getElementById("btnGen").style.opacity = "0.5";
  } else if (isAdmin) {
    document.getElementById("btnGen").disabled = false;
    document.getElementById("btnGen").style.opacity = "1";
  }

  currentMatches.forEach((m) => {
    const tA = currentTeams.find((t) => t.id === m.team_a_id);
    const tB = currentTeams.find((t) => t.id === m.team_b_id);
    const cA = tA ? tA.jersey_color : "#fff";
    const cB = tB ? tB.jersey_color : "#fff";
    const finalClass = m.match_type === "final" ? "final-match" : "";
    const badge =
      m.match_type === "final"
        ? `<span class="final-badge">Finals</span>`
        : `<span>Match ${m.match_order}</span>`;
    const scoreClass = m.status === "finished" ? "bg-green" : "";
    const score =
      m.status === "finished" ? `${m.score_a} - ${m.score_b}` : "VS";

    let controls = isAdmin
      ? `<div class="match-controls"><span class="btn-icon" onclick="moveMatch('${m.id}', ${m.match_order}, -1)">▲</span><span class="btn-icon" onclick="moveMatch('${m.id}', ${m.match_order}, 1)">▼</span><span class="btn-icon" style="color:var(--danger);" onclick="deleteMatch('${m.id}')">🗑</span></div>`
      : "";

    const div = document.createElement("div");
    div.className = `match-card ${finalClass}`;
    div.onclick = (e) => {
      if (!e.target.classList.contains("btn-icon")) openMatchModal(m, tA, tB);
    };
    div.innerHTML = `
       <div class="match-header">${badge}<span>${new Date(
      m.start_time
    ).toLocaleDateString()}</span></div>
       <div class="match-body">
         <div class="team-info"><div class="team-dot" style="background:${cA}; box-shadow:0 0 5px ${cA};"></div><span style="font-weight:600; font-size:14px;">${
      m.team_a_name
    }</span></div>
         <div class="score-badge ${scoreClass}">${score}</div>
         <div class="team-info" style="justify-content:flex-end;"><span style="font-weight:600; font-size:14px; text-align:right;">${
           m.team_b_name
         }</span><div class="team-dot" style="background:${cB}; box-shadow:0 0 5px ${cB};"></div></div>
       </div>${controls}`;
    list.appendChild(div);
  });
  calcStandings();
}

async function moveMatch(id, order, dir) {
  event.stopPropagation();
  const newOrder = Math.max(1, order + dir * 1.5);
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
  event.stopPropagation();
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
        }</td><td class="pts-cell" style="padding-right:16px;">${
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
  ).innerHTML = `<div style="text-align:center;"><div class="text-sm" style="margin-bottom:10px;">${
    m.match_type === "final" ? "🏆 GRAND FINAL" : "Match Details"
  }</div><div class="flex-center" style="gap:20px;"><div style="text-align:center;"><div style="width:40px; height:40px; background:${cA}; border-radius:50%; margin:0 auto 5px auto; box-shadow:0 0 10px ${cA};"></div><div style="font-weight:bold;">${
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
