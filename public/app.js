const API = "/api";
let token = localStorage.getItem("token");
let activeTournamentId = null;

// --- INIT ---
function init() {
  const authSection = document.getElementById("auth-section");
  const logoutBtn = document.getElementById("logoutBtn");
  const dashboard = document.getElementById("dashboard-view");
  const adminTournDiv = document.getElementById("admin-create-tourn");

  if (token) {
    authSection.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    dashboard.classList.remove("hidden");

    // Check Admin
    try {
      const payload = JSON.parse(atob(token));
      if (payload.isAdmin) adminTournDiv.classList.remove("hidden");
    } catch (e) {}

    loadTournaments();
  } else {
    authSection.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    dashboard.classList.add("hidden");
  }
}

// --- UTILS ---
function out(msg) {
  const o = document.getElementById("output");
  o.textContent = JSON.stringify(msg, null, 2);
  setTimeout(() => (o.textContent = ""), 3000);
}
function getVal(id) {
  return document.getElementById(id).value;
}

// --- AUTH ---
async function login() {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: getVal("username"),
      password: getVal("password"),
    }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    location.reload();
  } else out(data);
}
async function signup() {
  /* Keep existing signup logic */
  const res = await fetch(`${API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: getVal("username"),
      password: getVal("password"),
    }),
  });
  out(await res.json());
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
  const tourns = await res.json();
  const list = document.getElementById("tournament-list");
  list.innerHTML = "";

  tourns.forEach((t) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<div style="font-weight:bold; font-size:18px;">${
      t.name
    }</div><div style="font-size:12px; color:#94a3b8;">Created: ${new Date(
      t.created_at
    ).toLocaleDateString()}</div>`;
    div.onclick = () => openTournament(t.id, t.name);
    div.style.cursor = "pointer";
    list.appendChild(div);
  });
}

async function createTournament() {
  const name = getVal("newTournName");
  if (!name) return;
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

// --- ACTIVE TOURNAMENT VIEW ---
async function openTournament(id, name) {
  activeTournamentId = id;
  document.getElementById("dashboard-view").classList.add("hidden");
  document.getElementById("tournament-view").classList.remove("hidden");
  document.getElementById("active-tourn-title").textContent = name;

  // Show Admin Controls if Admin
  try {
    const p = JSON.parse(atob(token));
    if (p.isAdmin)
      document
        .getElementById("admin-tourn-controls")
        .classList.remove("hidden");
  } catch (e) {}

  loadTeams();
  loadMatches();
}

function closeTournament() {
  activeTournamentId = null;
  document.getElementById("dashboard-view").classList.remove("hidden");
  document.getElementById("tournament-view").classList.add("hidden");
}

// --- TEAMS (Scoped to Tournament) ---
async function loadTeams() {
  if (!activeTournamentId) return;
  const res = await fetch(`${API}/teams?tournamentId=${activeTournamentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const teams = await res.json();

  const list = document.getElementById("teams-list");
  list.innerHTML = "";
  teams.forEach((t) => {
    const div = document.createElement("div");
    div.style =
      "background:#1e293b; padding:10px; border-radius:8px; text-align:center; font-weight:bold;";
    div.textContent = t.name;
    list.appendChild(div);
  });

  // Populate Dropdowns
  const sA = document.getElementById("teamASelect");
  const sB = document.getElementById("teamBSelect");
  sA.innerHTML = "<option>Select A</option>";
  sB.innerHTML = "<option>Select B</option>";
  teams.forEach((t) => {
    sA.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    sB.innerHTML += `<option value="${t.id}">${t.name}</option>`;
  });
}

async function addTeam() {
  const name = prompt("Team Name?");
  if (!name) return;
  await fetch(`${API}/teams`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, tournamentId: activeTournamentId }),
  });
  loadTeams();
}

// --- FIXTURES ---
async function generateFixtures() {
  if (!confirm("Auto-generate matches for all teams?")) return;
  const res = await fetch(`${API}/fixtures`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tournamentId: activeTournamentId }),
  });
  out(await res.json());
  loadMatches();
}

async function scheduleMatch() {
  const teamAId = getVal("teamASelect");
  const teamBId = getVal("teamBSelect");
  const startTime = getVal("matchDate");

  await fetch(`${API}/matches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      teamAId,
      teamBId,
      startTime,
      tournamentId: activeTournamentId,
    }),
  });
  loadMatches();
}

async function loadMatches() {
  if (!activeTournamentId) return;
  const res = await fetch(`${API}/matches?tournamentId=${activeTournamentId}`);
  const matches = await res.json();

  const list = document.getElementById("matches-list");
  list.innerHTML = "";
  matches.forEach((m) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div style="font-size:12px; color:#94a3b8;">${new Date(
        m.start_time
      ).toLocaleString()}</div>
      <div class="flex-between">
        <span>${m.team_a_name}</span> 
        <b style="color:#22c55e;">VS</b> 
        <span>${m.team_b_name}</span>
      </div>
    `;
    list.appendChild(div);
  });
}

async function loadPlayers() {
  const res = await fetch(`${API}/players`);
  const data = await res.json();
  out(data);
}

init();
