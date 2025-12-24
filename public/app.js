const API = "/api";
let token = localStorage.getItem("token");
let isAdmin = false;

// Check Admin Status on Load
if (token) {
  try {
    const payload = JSON.parse(atob(token));
    isAdmin = payload.isAdmin;
    if (isAdmin) {
      const form = document.getElementById("admin-match-form");
      if (form) form.style.display = "block";
    }
  } catch (e) {
    console.error("Invalid token");
  }
}

function out(msg) {
  document.getElementById("output").textContent = JSON.stringify(msg, null, 2);
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
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
    token = data.token;
    localStorage.setItem("token", token);
    location.reload(); // Reload to show Admin UI
  }
  out(data);
}

async function signup() {
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

// --- LOADERS ---
async function loadTeams() {
  const res = await fetch(`${API}/teams`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const teams = await res.json();
  out(teams);

  // Populate Dropdowns for Matches
  const selA = document.getElementById("teamASelect");
  const selB = document.getElementById("teamBSelect");

  if (selA && selB) {
    selA.innerHTML = "<option value=''>Select Team A</option>";
    selB.innerHTML = "<option value=''>Select Team B</option>";

    teams.forEach((t) => {
      selA.innerHTML += `<option value="${t.id}">${t.name}</option>`;
      selB.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
  }
}

async function loadPlayers() {
  const res = await fetch(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  out(await res.json());
}

// --- ACTIONS ---
async function addTeam() {
  const name = prompt("Team name?");
  if (!name) return;
  const res = await fetch(`${API}/teams`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  out(await res.json());
  loadTeams();
}

async function addPlayer() {
  const name = prompt("Player name?");
  if (!name) return;
  const res = await fetch(`${API}/players`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  out(await res.json());
}

// --- MATCHES ---
async function scheduleMatch() {
  const teamAId = getVal("teamASelect");
  const teamBId = getVal("teamBSelect");
  const startTime = getVal("matchDate");

  if (!teamAId || !teamBId || !startTime) {
    alert("Please fill all fields");
    return;
  }

  const res = await fetch(`${API}/matches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ teamAId, teamBId, startTime }),
  });

  const data = await res.json();
  out(data);
  if (data.id) loadMatches();
}

async function loadMatches() {
  const res = await fetch(`${API}/matches`);
  const matches = await res.json();

  const container = document.getElementById("matches-list");
  if (!container) return;

  container.innerHTML = "";

  matches.forEach((m) => {
    const date = new Date(m.start_time).toLocaleString();
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:14px; margin-bottom:8px;">
        <span>${date}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:18px; font-weight:bold;">
        <span style="width:40%; text-align:left;">${m.team_a_name}</span>
        <span style="color:#22c55e;">VS</span>
        <span style="width:40%; text-align:right;">${m.team_b_name}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

// Init
loadMatches();
