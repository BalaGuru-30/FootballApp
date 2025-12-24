const API = "/api";
let token = localStorage.getItem("token");
let isAdmin = false;
let activeTournamentId = null;
let activeTournamentDate = null;
let allTournaments = [];
let currentTeams = [];
let currentMatches = [];
let activeTab = "standings";
let currentFilterTeamId = "all";

function init() {
  if (token) {
    try {
      const p = JSON.parse(atob(token));
      if (p.isAdmin) {
        isAdmin = true;
        // CHANGE 1: Admin Title
        document.getElementById("app-title").textContent =
          "🏆 LeagueMgr (Admin)";
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

  setInterval(() => {
    if (!document.hidden) {
      if (activeTournamentId) {
        if (activeTab === "fixtures") loadMatches(true);
        if (activeTab === "teams") loadTeams(true);
        if (activeTab === "standings") loadMatches(true);
      }
      if (
        document
          .getElementById("section-players")
          .classList.contains("hidden") === false
      ) {
        loadAllPlayers();
      }
    }
  }, 3000);
}

// --- UI HELPERS ---
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg || "✅ Success";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

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
  // CHANGE 3: Toggle both modal and backdrop
  document.getElementById("login-modal").classList.toggle("hidden");
  document.getElementById("login-backdrop").classList.toggle("hidden");
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
  } else {
    // CHANGE 2: Show specific error
    alert(data.error || "Login Failed");
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

  if (
    list.childElementCount === players.length &&
    document.activeElement.tagName !== "INPUT"
  )
    return players;

  list.innerHTML = "";
  players.forEach((p) => {
    const delBtn = isAdmin
      ? `<span onclick="deleteGlobalPlayer('${p.id}')" style="color:var(--danger); cursor:pointer;">×</span>`
      : "";
    list.innerHTML += `<div class="card" style="padding:10px; display:flex; justify-content:space-between;"><span>${p.name}</span>${delBtn}</div>`;
  });
  return players;
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
  activeTab = tab;
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
async function loadTeams(silent = false) {
  const res = await fetch(`${API}/teams?tournamentId=${activeTournamentId}`);
  currentTeams = await res.json();
  const list = document.getElementById("teams-list");

  if (!silent) list.innerHTML = "";

  const sA = document.getElementById("teamASelect");
  const sB = document.getElementById("teamBSelect");

  if (sA.innerHTML.length < 50 || !silent) {
    sA.innerHTML = "<option value=''>Select Team</option>";
    sB.innerHTML = "<option value=''>Select Team</option>";
    const filterSel = document.getElementById("fixtureFilter");
    const allOpt = "<option value='all'>Show All Teams</option>";
    if (document.activeElement !== filterSel) filterSel.innerHTML = allOpt;

    currentTeams.forEach((t) => {
      const opt = `<option value="${t.id}">${t.name}</option>`;
      sA.innerHTML += opt;
      sB.innerHTML += opt;
      if (document.activeElement !== filterSel) filterSel.innerHTML += opt;
    });
    filterSel.value = currentFilterTeamId;
  }

  if (!silent) renderTeamList(list);
  else if (document.activeElement.tagName !== "INPUT") renderTeamList(list);
}

function renderTeamList(container) {
  container.innerHTML = "";
  currentTeams.forEach((t) => {
    const rosterHtml = t.team_players
      .map(
        (tp) => `
        <span class="roster-tag">
          ${tp.players.name} 
          ${
            isAdmin
              ? `<span class="roster-rm" onclick="removePlayerFromTeam('${
                  t.id
                }', '${tp.player_id}', '${tp.players.name.replace(
                  /'/g,
                  "\\'"
                )}')">×</span>`
              : ""
          }
        </span>
     `
      )
      .join(" ");

    const adminControls = isAdmin
      ? `
       <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:8px; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
          <button class="btn-sm btn-primary" onclick="openPlayerPicker('${t.id}')">+ Player</button>
          <div>
            <span class="btn-icon" style="font-size:14px;" onclick="prepareEditTeam('${t.id}')">✏️</span>
            <span class="btn-icon" style="color:var(--danger); font-size:14px;" onclick="deleteTeam('${t.id}')">🗑</span>
          </div>
       </div>`
      : "";

    container.innerHTML += `<div class="card" style="border-left:5px solid ${
      t.jersey_color
    };">
       <div style="font-weight:bold;">${t.name}</div>
       <div style="font-size:12px; color:#94a3b8; margin-top:5px; line-height: 1.6;">${
         rosterHtml || "No players"
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
  document.getElementById("newTeamName").value = "";
  showToast("Team Added");
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
function prepareEditTeam(id) {
  const t = currentTeams.find((x) => x.id === id);
  document.getElementById("editTeamId").value = id;
  document.getElementById("editTeamName").value = t.name;
  document.getElementById("editTeamColor").value = t.jersey_color;
  openModal("edit-team");
}
async function saveTeamEdit() {
  const id = document.getElementById("editTeamId").value;
  const name = document.getElementById("editTeamName").value;
  const color = document.getElementById("editTeamColor").value;
  await fetch(`${API}/teams`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "edit",
      teamId: id,
      name,
      jerseyColor: color,
    }),
  });
  forceCloseModal("edit-team");
  showToast("Team Updated");
  loadTeams();
}
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
  showToast("Player Added");
  loadTeams();
}
async function removePlayerFromTeam(teamId, playerId, playerName) {
  if (!confirm(`Remove ${playerName} from team?`)) return;
  await fetch(`${API}/teams`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "remove_player", teamId, playerId }),
  });
  loadTeams();
}

// --- MATCHES ---
function applyFixtureFilter() {
  currentFilterTeamId = document.getElementById("fixtureFilter").value;
  renderMatchList(document.getElementById("matches-list"));
}

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
  const type = document.getElementById("matchTypeSelect").value;

  if (!tA || !tB) return alert("Select teams");
  if (tA === tB) return alert("Teams must be different");

  await fetch(`${API}/matches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      teamAId: tA,
      teamBId: tB,
      startTime: activeTournamentDate,
      tournamentId: activeTournamentId,
      matchType: type,
    }),
  });

  document.getElementById("teamASelect").value = "";
  document.getElementById("teamBSelect").value = "";
  document.getElementById("addMatchDetails").removeAttribute("open");

  showToast("Match Created");
  loadMatches();
}

async function loadMatches(silent = false) {
  const res = await fetch(`${API}/matches?tournamentId=${activeTournamentId}`);
  currentMatches = await res.json();

  // Sort: Finals top, then match order
  currentMatches.sort((a, b) => {
    if (a.match_type === "final" && b.match_type !== "final") return -1;
    if (a.match_type !== "final" && b.match_type === "final") return 1;
    return a.match_order - b.match_order;
  });

  if (!silent) {
    renderMatchList(document.getElementById("matches-list"));
    renderFinalsSection();
  } else if (document.activeElement.tagName !== "INPUT") {
    renderMatchList(document.getElementById("matches-list"));
    renderFinalsSection();
  }
}

function renderMatchList(container) {
  container.innerHTML = "";
  let matchCounter = 0;

  if (isAdmin && currentMatches.length > 0) {
    document.getElementById("btnGen").disabled = true;
    document.getElementById("btnGen").style.opacity = "0.5";
  } else if (isAdmin) {
    document.getElementById("btnGen").disabled = false;
    document.getElementById("btnGen").style.opacity = "1";
  }

  currentMatches.forEach((m, index) => {
    if (currentFilterTeamId !== "all") {
      if (
        m.team_a_id !== currentFilterTeamId &&
        m.team_b_id !== currentFilterTeamId
      )
        return;
    }

    const isFinal = m.match_type === "final";
    if (!isFinal) matchCounter++;

    const tA = currentTeams.find((t) => t.id === m.team_a_id);
    const tB = currentTeams.find((t) => t.id === m.team_b_id);
    const cA = tA ? tA.jersey_color : "#fff";
    const cB = tB ? tB.jersey_color : "#fff";
    const score =
      m.status === "finished" ? `${m.score_a} - ${m.score_b}` : "VS";
    const scoreClass = m.status === "finished" ? "bg-green" : "";
    const matchLabel = isFinal ? "🏆 GRAND FINAL" : `Match ${matchCounter}`;

    let delBtn = isAdmin
      ? `<span style="color:var(--danger); cursor:pointer;" class="delete-btn" onclick="deleteMatch(event, '${m.id}')">🗑</span>`
      : "";

    let reorderUI =
      isAdmin && !isFinal
        ? `
       <div class="reorder-controls">
         <div class="reorder-btn" onclick="moveMatch(event, ${index}, -1)">▲</div>
         <div class="reorder-btn" onclick="moveMatch(event, ${index}, 1)">▼</div>
       </div>`
        : "";

    const div = document.createElement("div");
    div.className = `match-card ${isFinal ? "final-match" : ""}`;
    div.onclick = (e) => {
      if (
        !e.target.closest(".reorder-controls") &&
        !e.target.closest(".delete-btn")
      )
        openMatchModal(m, tA, tB);
    };

    div.innerHTML = `
       <div class="match-content">
         <div class="match-header"><span>${matchLabel}</span> ${delBtn}</div>
         <div class="match-body">
           <div class="team-info"><div style="width:10px; height:10px; border-radius:50%; background:${cA}; box-shadow:0 0 5px ${cA};"></div><span style="font-weight:600; font-size:13px;">${m.team_a_name}</span></div>
           <div class="score-badge ${scoreClass}">${score}</div>
           <div class="team-info" style="justify-content:flex-end;"><span style="font-weight:600; font-size:13px; text-align:right;">${m.team_b_name}</span><div style="width:10px; height:10px; border-radius:50%; background:${cB}; box-shadow:0 0 5px ${cB};"></div></div>
         </div>
       </div>
       ${reorderUI}
     `;
    container.appendChild(div);
  });
  calcStandings();
}

async function autoUpdateFinals() {
  if (!confirm("Update Finals with Top 2 Teams?")) return;

  const stats = {};
  currentTeams.forEach((t) => (stats[t.id] = { id: t.id, pts: 0, gd: 0 }));
  currentMatches.forEach((m) => {
    if (m.status === "finished" && m.match_type !== "final") {
      const a = m.team_a_id,
        b = m.team_b_id;
      stats[a].gd += m.score_a - m.score_b;
      stats[b].gd += m.score_b - m.score_a;
      if (m.score_a > m.score_b) stats[a].pts += 3;
      else if (m.score_b > m.score_a) stats[b].pts += 3;
      else {
        stats[a].pts++;
        stats[b].pts++;
      }
    }
  });
  const sorted = Object.values(stats).sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd
  );
  if (sorted.length < 2) return alert("Not enough teams");

  const topA = sorted[0].id;
  const topB = sorted[1].id;

  const existingFinal = currentMatches.find((m) => m.match_type === "final");

  if (existingFinal) {
    await fetch(`${API}/matches`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        matchId: existingFinal.id,
        teamAId: topA,
        teamBId: topB,
      }),
    });
    showToast("Finals Updated!");
  } else {
    await fetch(`${API}/matches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teamAId: topA,
        teamBId: topB,
        startTime: activeTournamentDate,
        tournamentId: activeTournamentId,
        matchType: "final",
      }),
    });
    showToast("Finals Created!");
  }
  loadMatches();
}

function renderFinalsSection() {
  const container = document.getElementById("finals-display-area");
  const finalMatch = currentMatches.find((m) => m.match_type === "final");

  if (finalMatch) {
    const tA = currentTeams.find((t) => t.id === finalMatch.team_a_id);
    const tB = currentTeams.find((t) => t.id === finalMatch.team_b_id);
    const cA = tA ? tA.jersey_color : "#fff";
    const cB = tB ? tB.jersey_color : "#fff";
    const score =
      finalMatch.status === "finished"
        ? `${finalMatch.score_a} - ${finalMatch.score_b}`
        : "VS";

    container.innerHTML = `
       <div class="match-card final-match" onclick="openMatchModal({id:'${
         finalMatch.id
       }', ...${JSON.stringify(finalMatch).replace(
      /"/g,
      "&quot;"
    )}}, null, null)">
         <div class="match-content">
           <div class="match-body">
             <div class="team-info"><div style="width:10px; height:10px; border-radius:50%; background:${cA};"></div><span style="font-weight:bold;">${
      finalMatch.team_a_name
    }</span></div>
             <div class="score-badge">${score}</div>
             <div class="team-info" style="justify-content:flex-end;"><span style="font-weight:bold;">${
               finalMatch.team_b_name
             }</span><div style="width:10px; height:10px; border-radius:50%; background:${cB};"></div></div>
           </div>
         </div>
       </div>`;
  } else {
    container.innerHTML = `<div style="text-align:center; color:#64748b; padding:20px; border:1px dashed #334155; border-radius:12px;">Finals TBD</div>`;
  }
}

async function moveMatch(e, index, dir) {
  e.stopPropagation();
  const currentMatch = currentMatches[index];
  const targetIndex = index + dir;

  if (targetIndex < 0 || targetIndex >= currentMatches.length) return;
  const targetMatch = currentMatches[targetIndex];
  if (targetMatch.match_type === "final") return;

  let newOrder;
  if (dir === -1) {
    const prevOrder =
      targetIndex > 0 ? currentMatches[targetIndex - 1].match_order : 0;
    newOrder = (targetMatch.match_order + prevOrder) / 2;
  } else {
    const nextOrder =
      targetIndex < currentMatches.length - 1
        ? currentMatches[targetIndex + 1].match_order
        : targetMatch.match_order + 2;
    newOrder = (targetMatch.match_order + nextOrder) / 2;
  }

  currentMatch.match_order = newOrder;
  loadMatches(true);

  await fetch(`${API}/matches`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ matchId: currentMatch.id, newOrder }),
  });
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
    if (m.status === "finished" && m.match_type !== "final") {
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
  if (!tA) tA = currentTeams.find((t) => t.id === m.team_a_id);
  if (!tB) tB = currentTeams.find((t) => t.id === m.team_b_id);

  const cA = tA ? tA.jersey_color : "#fff";
  const cB = tB ? tB.jersey_color : "#fff";
  const adminUI = isAdmin
    ? `<div style="display:flex; justify-content:center; gap:10px; margin-top:20px;"><input id="scoreA" type="number" inputmode="numeric" value="${
        m.score_a || 0
      }" style="width:60px; font-size:20px; text-align:center;"><span style="font-size:20px; align-self:center;">-</span><input id="scoreB" type="number" inputmode="numeric" value="${
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
  showToast("Score Updated");
  loadMatches();
}

init();
