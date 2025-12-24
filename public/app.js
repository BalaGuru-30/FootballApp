const API = "/api";
let token = localStorage.getItem("token");
let isAdmin = false;
let activeTournamentId = null;
let currentTeams = []; // Store loaded teams for easy access

function init() {
  if (token) {
    try {
      const p = JSON.parse(atob(token));
      if (p.isAdmin) {
        isAdmin = true;
        document.getElementById("loginBtn").classList.add("hidden");
        document.getElementById("logoutBtn").classList.remove("hidden");
        document
          .querySelectorAll(".box-admin")
          .forEach((e) => e.classList.remove("hidden"));
      }
    } catch (e) {
      logout();
    }
  }
  loadTournaments();
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

// --- GLOBAL PLAYERS ---
async function createGlobalPlayer() {
  const name = document.getElementById("newGlobalPlayer").value;
  if (!name) return;
  const res = await fetch(`${API}/players`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  const d = await res.json();
  if (d.id) {
    alert("Player Created!");
    document.getElementById("newGlobalPlayer").value = "";
  }
}

// --- TOURNAMENTS ---
async function loadTournaments() {
  const res = await fetch(`${API}/tournaments`);
  const tourns = await res.json();
  const list = document.getElementById("tournament-list");
  list.innerHTML = "";
  tourns.forEach((t) => {
    const div = document.createElement("div");
    div.className = "card";
    div.style.cursor = "pointer";
    div.innerHTML = `<h3>${t.name}</h3>`;
    div.onclick = () => openTournament(t.id, t.name);
    list.appendChild(div);
  });
}

async function createTournament() {
  const name = document.getElementById("newTournName").value;
  await fetch(`${API}/tournaments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  loadTournaments();
}

async function openTournament(id, name) {
  activeTournamentId = id;
  document.getElementById("dashboard-view").classList.add("hidden");
  document.getElementById("tournament-view").classList.remove("hidden");
  document.getElementById("active-tourn-title").textContent = name;
  loadMatches();
  loadTeams();
}

function closeTournament() {
  activeTournamentId = null;
  document.getElementById("dashboard-view").classList.remove("hidden");
  document.getElementById("tournament-view").classList.add("hidden");
}

function showTab(tab) {
  document.getElementById("tab-fixtures").classList.add("hidden");
  document.getElementById("tab-teams").classList.add("hidden");
  document.getElementById(`tab-${tab}`).classList.remove("hidden");
}

// --- TEAMS & ROSTERS ---
async function loadTeams() {
  // Fetch teams WITH players
  const res = await fetch(`${API}/teams?tournamentId=${activeTournamentId}`);
  currentTeams = await res.json();

  const list = document.getElementById("teams-list");
  list.innerHTML = "";

  currentTeams.forEach((t) => {
    // Generate Player List Text
    const playerNames = t.team_players.map((tp) => tp.players.name).join(", ");

    // Edit Controls (Admin Only)
    let adminUI = "";
    if (isAdmin) {
      adminUI = `
        <div style="margin-top:10px; border-top:1px solid #475569; padding-top:5px; font-size:12px;">
           <button onclick="editTeamName('${t.id}')" style="background:#3b82f6; width:auto; padding:4px 8px; font-size:10px;">Rename</button>
           <button onclick="addPlayerToTeam('${t.id}')" style="background:#22c55e; width:auto; padding:4px 8px; font-size:10px;">+ Add Player</button>
        </div>
      `;
    }

    const div = document.createElement("div");
    div.className = "card";
    div.style.borderLeft = `5px solid ${t.jersey_color}`;
    div.innerHTML = `
      <div class="flex-between">
        <span style="font-weight:bold; font-size:18px;">${t.name}</span>
      </div>
      <div style="font-size:13px; color:#94a3b8; margin-top:5px;">Players: ${
        playerNames || "None"
      }</div>
      ${adminUI}
    `;
    list.appendChild(div);
  });
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

async function editTeamName(id) {
  const newName = prompt("New Team Name:");
  if (!newName) return;
  await fetch(`${API}/teams`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "rename", teamId: id, name: newName }),
  });
  loadTeams();
}

async function addPlayerToTeam(teamId) {
  // Simple flow: Load all players, show prompt (in a real app, use a dropdown modal)
  // For now: Ask for Exact Player Name or create new
  const pName = prompt(
    "Enter Global Player Name to Add (Must exist globally first):"
  );
  if (!pName) return;

  // Find player ID by name (Quick hack to avoid huge UI)
  const allPlayersRes = await fetch(`${API}/players`);
  const allPlayers = await allPlayersRes.json();
  const player = allPlayers.find(
    (p) => p.name.toLowerCase() === pName.toLowerCase()
  );

  if (!player) {
    if (
      confirm("Player not found. Create new global player '" + pName + "'?")
    ) {
      const newP = await fetch(`${API}/players`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: pName }),
      });
      const newPData = await newP.json();
      await linkPlayer(teamId, newPData.id);
    }
  } else {
    await linkPlayer(teamId, player.id);
  }
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
  loadTeams();
}

// --- MATCHES ---
async function generateFixtures() {
  if (!confirm("Generate?")) return;
  await fetch(`${API}/fixtures`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tournamentId: activeTournamentId }),
  });
  loadMatches();
}

async function loadMatches() {
  const res = await fetch(`${API}/matches?tournamentId=${activeTournamentId}`);
  const matches = await res.json();
  const list = document.getElementById("matches-list");
  list.innerHTML = "";

  matches.forEach((m) => {
    // Find Team Colors
    const tA = currentTeams.find((t) => t.id === m.team_a_id);
    const tB = currentTeams.find((t) => t.id === m.team_b_id);
    const colorA = tA ? tA.jersey_color : "#fff";
    const colorB = tB ? tB.jersey_color : "#fff";

    const div = document.createElement("div");
    div.className = "card";
    div.style.cursor = "pointer";
    div.onclick = () => openMatchModal(m, tA, tB);

    // Status Dot
    const statusColor = m.status === "finished" ? "#64748b" : "#22c55e";

    div.innerHTML = `
      <div class="flex-between">
        <span style="font-size:12px; color:#94a3b8;">${new Date(
          m.start_time
        ).toLocaleString()}</span>
        <div style="width:8px; height:8px; border-radius:50%; background:${statusColor}"></div>
      </div>
      <div class="flex-between" style="margin-top:10px; font-weight:bold; font-size:16px;">
        <span style="border-left:4px solid ${colorA}; padding-left:8px;">${
      m.team_a_name
    }</span>
        <span style="font-size:20px;">${m.score_a ?? 0} - ${
      m.score_b ?? 0
    }</span>
        <span style="border-right:4px solid ${colorB}; padding-right:8px;">${
      m.team_b_name
    }</span>
      </div>
    `;
    list.appendChild(div);
  });
}

// --- MATCH DETAIL SCREEN ---
function openMatchModal(match, teamA, teamB) {
  const modal = document.getElementById("match-modal");
  const content = document.getElementById("match-modal-content");
  modal.classList.remove("hidden");

  const colorA = teamA ? teamA.jersey_color : "#333";
  const colorB = teamB ? teamB.jersey_color : "#333";

  // Roster Lists
  const playersA = teamA
    ? teamA.team_players
        .map((tp) => `<div class="player-row">${tp.players.name}</div>`)
        .join("")
    : "";
  const playersB = teamB
    ? teamB.team_players
        .map(
          (tp) =>
            `<div class="player-row" style="text-align:right;">${tp.players.name}</div>`
        )
        .join("")
    : "";

  // Admin Inputs vs Public View
  let scoreUI = `<div class="score-big">${match.score_a ?? 0} - ${
    match.score_b ?? 0
  }</div>`;
  if (isAdmin) {
    scoreUI = `
      <div style="margin:20px 0;">
        <input id="scoreA" type="number" value="${
          match.score_a || 0
        }" style="width:60px; height:50px; font-size:30px; text-align:center;">
        <span style="font-size:30px; margin:0 10px;">-</span>
        <input id="scoreB" type="number" value="${
          match.score_b || 0
        }" style="width:60px; height:50px; font-size:30px; text-align:center;">
        <br>
        <button onclick="saveScore('${
          match.id
        }')" class="btn-primary" style="margin-top:10px; width:auto;">Update Score</button>
      </div>
    `;
  }

  content.innerHTML = `
    <h3 style="text-align:center; color:#94a3b8;">Match Details</h3>
    <div class="score-board" style="border-color:${colorA}; border-right-color:${colorB}; border-width:4px;">
       <div class="flex-between" style="font-size:20px; font-weight:bold;">
         <span style="color:${colorA}">${match.team_a_name}</span>
         <span style="color:${colorB}">${match.team_b_name}</span>
       </div>
       ${scoreUI}
    </div>
    
    <div class="lineups">
      <div>
        <h4 style="border-bottom:2px solid ${colorA}; display:inline-block; margin-bottom:10px;">${
    match.team_a_name
  }</h4>
        ${playersA || "<div style='color:#666'>No players</div>"}
      </div>
      <div style="text-align:right;">
         <h4 style="border-bottom:2px solid ${colorB}; display:inline-block; margin-bottom:10px;">${
    match.team_b_name
  }</h4>
         ${playersB || "<div style='color:#666'>No players</div>"}
      </div>
    </div>
  `;
}

function closeMatchModal() {
  document.getElementById("match-modal").classList.add("hidden");
}

async function saveScore(matchId) {
  const sA = document.getElementById("scoreA").value;
  const sB = document.getElementById("scoreB").value;
  await fetch(`${API}/matches`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ matchId, scoreA: sA, scoreB: sB }),
  });
  closeMatchModal();
  loadMatches();
}

init();
