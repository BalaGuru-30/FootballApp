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

// Pagination & Tab State
let activeTournTab = "today";
let upcomingPage = 1;
let pastPage = 1;
const PAGE_SIZE = 5;
let currentUpcomingList = [];
let currentPastList = [];

function init() {
  if (token) {
    try {
      const p = JSON.parse(atob(token));
      if (p.isAdmin) {
        isAdmin = true;
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
    if (!document.hidden && activeTournamentId) {
      if (activeTab === "fixtures") loadMatches(true);
      if (activeTab === "teams") loadTeams(true);
      if (activeTab === "standings") loadMatches(true);
    }
    if (
      !document.hidden &&
      !document.getElementById("section-players").classList.contains("hidden")
    ) {
      loadAllPlayers();
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

function switchTournTab(tab) {
  activeTournTab = tab;
  document.querySelectorAll(".segment-btn").forEach((b) => {
    b.classList.remove("active");
    if (b.id === `seg-${tab}`) b.classList.add("active");
  });
  document
    .querySelectorAll(".tourn-tab-content")
    .forEach((c) => c.classList.add("hidden"));
  document.getElementById(`tourn-tab-${tab}`).classList.remove("hidden");
  renderTournaments(allTournaments);
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
    alert(data.error || "Login Failed");
  }
}
function logout() {
  localStorage.removeItem("token");
  location.reload();
}

// --- TOURNAMENTS ---
async function loadTournaments() {
  try {
    const res = await fetch(`${API}/tournaments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    allTournaments = await res.json();
    if (!Array.isArray(allTournaments)) allTournaments = [];
    renderTournaments(allTournaments);
  } catch (e) {
    console.error(e);
  }
}

function renderTournaments(list) {
  const todayDate = new Date();
  const year = todayDate.getFullYear();
  const month = String(todayDate.getMonth() + 1).padStart(2, "0");
  const day = String(todayDate.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  const todayList = [];
  const upcomingList = [];
  const pastList = [];

  list.forEach((t) => {
    if (t.tournament_date === todayStr) {
      todayList.push(t);
    } else if (t.tournament_date > todayStr) {
      upcomingList.push(t);
    } else {
      pastList.push(t);
    }
  });

  upcomingList.reverse();
  currentUpcomingList = upcomingList;
  currentPastList = pastList;

  const todayContainer = document.getElementById("list-today");
  const todayHeader = document.getElementById("today-header");
  todayContainer.innerHTML = "";
  if (todayList.length > 0) {
    todayHeader.classList.remove("hidden");
    todayList.forEach((t) => todayContainer.appendChild(createTournCard(t)));
  } else {
    todayHeader.classList.add("hidden");
    todayContainer.innerHTML = `<div style="text-align:center; color:var(--text-dim); padding:20px;">No tournaments today</div>`;
  }

  renderPaginatedSection("upcoming");
  renderPaginatedSection("past");
}

function renderPaginatedSection(type) {
  const container = document.getElementById(`list-${type}`);
  container.innerHTML = "";
  const list = type === "upcoming" ? currentUpcomingList : currentPastList;
  const page = type === "upcoming" ? upcomingPage : pastPage;
  const controls = document.getElementById(`pag-${type}`);

  if (list.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-dim); padding:20px;">No ${type} tournaments</div>`;
    controls.classList.add("hidden");
    return;
  }

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const slice = list.slice(start, end);

  slice.forEach((t) => container.appendChild(createTournCard(t)));

  if (list.length > PAGE_SIZE) {
    controls.classList.remove("hidden");
    document.getElementById(`page-num-${type}`).textContent = `Page ${page}`;
    document.getElementById(`btn-prev-${type}`).disabled = page === 1;
    document.getElementById(`btn-prev-${type}`).style.opacity =
      page === 1 ? "0.3" : "1";
    document.getElementById(`btn-next-${type}`).disabled = end >= list.length;
    document.getElementById(`btn-next-${type}`).style.opacity =
      end >= list.length ? "0.3" : "1";
  } else {
    controls.classList.add("hidden");
  }
}

function changePage(type, delta) {
  if (type === "upcoming") upcomingPage += delta;
  else pastPage += delta;
  renderPaginatedSection(type);
}

function createTournCard(t) {
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
  return div;
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
  try {
    const res = await fetch(`${API}/players`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const players = await res.json();
    const list = document.getElementById("all-players-list");

    if (!Array.isArray(players)) return;
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
  } catch (e) {
    console.error(e);
  }
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
  try {
    const res = await fetch(`${API}/teams?tournamentId=${activeTournamentId}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      currentTeams = data;
    } else {
      currentTeams = [];
    }

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
  } catch (e) {
    console.error(e);
  }
}

function renderTeamList(container) {
  container.innerHTML = "";
  if (!currentTeams || currentTeams.length === 0) {
    container.innerHTML =
      "<div style='color:var(--text-dim); text-align:center; padding:20px;'>No Teams Found</div>";
    return;
  }

  currentTeams.forEach((t) => {
    const rosterHtml = (t.team_players || [])
      .map((tp) => {
        const pName = tp.players ? tp.players.name : "Unknown";
        return `
            <span class="roster-tag">
            ${pName} 
            ${
              isAdmin
                ? `<span class="roster-rm" onclick="removePlayerFromTeam('${
                    t.id
                  }', '${tp.player_id}', '${pName.replace(
                    /'/g,
                    "\\'"
                  )}')">×</span>`
                : ""
            }
            </span>
        `;
      })
      .join(" ");

    const adminControls = isAdmin
      ? `<div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:8px; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
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
  if (players) {
    const sel = document.getElementById("globalPlayerSelect");
    sel.innerHTML = players
      .map((p) => `<option value="${p.id}">${p.name}</option>`)
      .join("");
    openModal("pick-player");
  }
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
  showToast("Player Removed");
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
  try {
    const res = await fetch(
      `${API}/matches?tournamentId=${activeTournamentId}`
    );
    const data = await res.json();

    if (Array.isArray(data)) {
      currentMatches = data;
    } else {
      currentMatches = [];
    }

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
  } catch (e) {
    console.error(e);
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
    const isFinal = m.match_type === "final";
    if (!isFinal) matchCounter++;
    const matchLabel = isFinal ? "🏆 GRAND FINAL" : `Match ${matchCounter}`;

    if (currentFilterTeamId !== "all") {
      if (
        m.team_a_id !== currentFilterTeamId &&
        m.team_b_id !== currentFilterTeamId
      )
        return;
    }

    const tA = currentTeams.find((t) => t.id === m.team_a_id);
    const tB = currentTeams.find((t) => t.id === m.team_b_id);
    const cA = tA ? tA.jersey_color : "#fff";
    const cB = tB ? tB.jersey_color : "#fff";
    const score =
      m.status === "finished" ? `${m.score_a} - ${m.score_b}` : "VS";
    const scoreClass = m.status === "finished" ? "bg-green" : "";

    let delBtn = isAdmin
      ? `<span style="color:var(--danger); cursor:pointer;" class="delete-btn" onclick="deleteMatch(event, '${m.id}')">🗑</span>`
      : "";

    let reorderUI =
      isAdmin && !isFinal
        ? `<div class="reorder-controls">
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
      if (stats[a] && stats[b]) {
        stats[a].gd += m.score_a - m.score_b;
        stats[b].gd += m.score_b - m.score_a;
        if (m.score_a > m.score_b) stats[a].pts += 3;
        else if (m.score_b > m.score_a) stats[b].pts += 3;
        else {
          stats[a].pts++;
          stats[b].pts++;
        }
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

    // --- NEW WINNER LAYOUT ---
    let winnerHTML = "";
    if (finalMatch.status === "finished") {
      let winnerName = "";
      let winnerColor = "";

      if (finalMatch.score_a > finalMatch.score_b) {
        winnerName = finalMatch.team_a_name;
        winnerColor = cA;
      } else if (finalMatch.score_b > finalMatch.score_a) {
        winnerName = finalMatch.team_b_name;
        winnerColor = cB;
      }

      if (winnerName) {
        winnerHTML = `
                <div class="winner-section">
                    <div class="winner-avatar" style="background:${winnerColor}; box-shadow:0 0 15px ${winnerColor};"></div>
                    <div class="winner-info">
                        <div class="winner-label">🏆 Champion</div>
                        <div class="winner-name">${winnerName}</div>
                    </div>
                </div>
             `;
      }
    }
    // ---------------------------

    container.innerHTML = `
       ${winnerHTML}
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

  if (!Array.isArray(currentTeams)) return;

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

  if (Array.isArray(currentMatches)) {
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
  }

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

  let matchLabelNum = 0;
  for (let x of currentMatches) {
    if (x.match_type !== "final") matchLabelNum++;
    if (x.id === m.id) break;
  }
  const headerText =
    m.match_type === "final"
      ? "🏆 GRAND FINAL"
      : `Match Details - Match ${matchLabelNum}`;

  const adminUI = isAdmin
    ? `
    <div style="margin-top:20px;">
        <div style="display:flex; justify-content:center; gap:20px;">
            <div class="score-wrapper">
                <div class="score-input-container">
                    <div class="score-arrows">
                        <button class="arrow-btn" onclick="adjustScore('scoreA', 1)">▲</button>
                        <button class="arrow-btn" onclick="adjustScore('scoreA', -1)">▼</button>
                    </div>
                    <input id="scoreA" type="number" inputmode="numeric" value="${
                      m.score_a !== null ? m.score_a : 0
                    }">
                </div>
            </div>
            
            <div class="score-wrapper">
                <div class="score-input-container">
                    <input id="scoreB" type="number" inputmode="numeric" value="${
                      m.score_b !== null ? m.score_b : 0
                    }">
                    <div class="score-arrows">
                        <button class="arrow-btn" onclick="adjustScore('scoreB', 1)">▲</button>
                        <button class="arrow-btn" onclick="adjustScore('scoreB', -1)">▼</button>
                    </div>
                </div>
            </div>
        </div>
        <button class="btn btn-primary" onclick="saveScore('${
          m.id
        }')" style="margin-top:25px;">Update Score</button>
    </div>
    <div class="reset-btn" onclick="resetMatch('${m.id}')">Reset Match</div>
    `
    : "";

  document.getElementById("match-modal-content").innerHTML = `
    <div style="text-align:center;">
        <div style="font-size:12px; margin-bottom:10px;">${headerText}</div>
        <div style="display:flex; justify-content:center; align-items:center; gap:20px;">
            <div style="text-align:center;">
                <div style="width:40px; height:40px; background:${cA}; border-radius:50%; margin:0 auto 5px auto; box-shadow:0 0 10px ${cA};"></div>
                <div style="font-weight:bold;">${m.team_a_name}</div>
            </div>
            <div style="font-size:30px; font-weight:800;">${
              m.status === "finished" ? m.score_a + "-" + m.score_b : "VS"
            }</div>
            <div style="text-align:center;">
                <div style="width:40px; height:40px; background:${cB}; border-radius:50%; margin:0 auto 5px auto; box-shadow:0 0 10px ${cB};"></div>
                <div style="font-weight:bold;">${m.team_b_name}</div>
            </div>
        </div>
    </div>
    ${adminUI}
  `;
}

function adjustScore(id, delta) {
  const el = document.getElementById(id);
  let val = parseInt(el.value) || 0;
  val += delta;
  if (val < 0) val = 0;
  el.value = val;
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

async function resetMatch(id) {
  if (
    !confirm(
      "Are you sure? This will wipe the score and mark the match as not played."
    )
  )
    return;

  await fetch(`${API}/matches`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ matchId: id, action: "reset" }),
  });
  forceCloseModal("match");
  showToast("Match Reset");
  loadMatches();
}

init();
