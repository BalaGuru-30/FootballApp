const API = "/api";
let token = localStorage.getItem("token");
let activeTournamentId = null;
let isAdmin = false;

function init() {
  if (token) {
    try {
      const p = JSON.parse(atob(token));
      if (p.isAdmin) {
        isAdmin = true;
        document.getElementById("logoutBtn").classList.remove("hidden");
        document
          .getElementById("admin-create-tourn")
          .classList.remove("hidden");
        document.getElementById("login-modal").classList.add("hidden");
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
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    location.reload();
  } else alert("Login Failed");
}

function logout() {
  localStorage.removeItem("token");
  location.reload();
}

async function createAdmin() {
  const u = document.getElementById("newAdminName").value;
  const p = document.getElementById("newAdminPass").value;
  const res = await fetch(`${API}/admins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username: u, password: p }),
  });
  alert((await res.json()).message || "Done");
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
    div.style = "cursor:pointer";
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
  if (isAdmin)
    document.getElementById("admin-tourn-controls").classList.remove("hidden");

  loadTeams();
  loadMatches();
}

function closeTournament() {
  activeTournamentId = null;
  document.getElementById("dashboard-view").classList.remove("hidden");
  document.getElementById("tournament-view").classList.add("hidden");
}

// --- TEAMS ---
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

async function loadTeams() {
  const res = await fetch(`${API}/teams?tournamentId=${activeTournamentId}`);
  const teams = await res.json();
  const list = document.getElementById("teams-list");
  list.innerHTML = "";
  teams.forEach((t) => {
    list.innerHTML += `
      <div style="background:#334155; padding:10px; border-radius:6px; display:flex; align-items:center;">
        <span class="team-dot" style="background:${t.jersey_color}"></span> ${t.name}
      </div>`;
  });
}

// --- MATCHES & SCORING ---
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

async function updateScore(matchId) {
  const sA = document.getElementById(`sA-${matchId}`).value;
  const sB = document.getElementById(`sB-${matchId}`).value;

  await fetch(`${API}/matches`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ matchId, scoreA: sA, scoreB: sB }),
  });
  loadMatches();
}

async function loadMatches() {
  const res = await fetch(`${API}/matches?tournamentId=${activeTournamentId}`);
  const matches = await res.json();
  const list = document.getElementById("matches-list");
  list.innerHTML = "";

  if (matches.length === 0) list.innerHTML = "<p>No matches yet.</p>";

  matches.forEach((m) => {
    const div = document.createElement("div");
    div.className = "match-card";

    // Scores: If finished/started show score, else show 0-0 or empty
    const scoreA = m.score_a !== null ? m.score_a : "-";
    const scoreB = m.score_b !== null ? m.score_b : "-";

    // Logic: If Admin, show inputs. If Public, show text.
    let scoreDisplay = "";
    if (isAdmin) {
      scoreDisplay = `
        <div style="display:flex; align-items:center; gap:10px; margin-top:10px; justify-content:center;">
          <input id="sA-${m.id}" type="number" value="${
        m.score_a || 0
      }" style="width:50px; text-align:center;">
          <button onclick="updateScore('${
            m.id
          }')" style="width:auto; padding:5px; background:#22c55e;">Save</button>
          <input id="sB-${m.id}" type="number" value="${
        m.score_b || 0
      }" style="width:50px; text-align:center;">
        </div>
      `;
    } else {
      scoreDisplay = `
        <div style="display:flex; justify-content:center; font-size:24px; font-weight:bold; margin-top:5px;">
           ${scoreA} - ${scoreB}
        </div>
      `;
    }

    div.innerHTML = `
      <div style="text-align:center; color:#94a3b8; font-size:12px;">${new Date(
        m.start_time
      ).toLocaleString()}</div>
      <div class="flex-between" style="font-size:18px; margin-top:5px;">
        <span style="width:40%; text-align:left;">${m.team_a_name}</span>
        <span style="width:40%; text-align:right;">${m.team_b_name}</span>
      </div>
      ${scoreDisplay}
    `;
    list.appendChild(div);
  });
}

init();
