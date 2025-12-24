const API = "/api";
let token = localStorage.getItem("token");

// --- INITIALIZATION ---
function init() {
  const authSection = document.getElementById("auth-section");
  const logoutBtn = document.getElementById("logoutBtn");
  const adminControls = document.getElementById("admin-controls");
  const linkSection = document.getElementById("link-section");

  if (token) {
    // User is logged in
    authSection.classList.add("hidden");
    logoutBtn.classList.remove("hidden");

    try {
      const payload = JSON.parse(atob(token));

      if (payload.isAdmin) {
        adminControls.classList.remove("hidden");
        loadApprovals(); // Admin checks for pending requests
      } else {
        // Normal user? Show link section
        linkSection.classList.remove("hidden");
        loadPlayersForLink();
      }
    } catch (e) {
      console.error("Invalid token", e);
      logout();
    }
  } else {
    // Not logged in
    authSection.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    adminControls.classList.add("hidden");
    linkSection.classList.add("hidden");
  }

  loadMatches();
}

// --- UTILS ---
function out(msg) {
  const outEl = document.getElementById("output");
  outEl.textContent = JSON.stringify(msg, null, 2);
  setTimeout(() => {
    outEl.textContent = "";
  }, 3000);
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
    token = data.token;
    location.reload();
  } else {
    out(data);
  }
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

function logout() {
  localStorage.removeItem("token");
  location.reload();
}

// --- LINKING (USER SIDE) ---
async function loadPlayersForLink() {
  const res = await fetch(`${API}/players`);
  const players = await res.json();

  const sel = document.getElementById("linkPlayerSelect");
  sel.innerHTML = "<option value=''>Select Yourself...</option>";
  players.forEach((p) => {
    sel.innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
}

async function requestLink() {
  const playerId = getVal("linkPlayerSelect");
  if (!playerId) return alert("Select a player!");

  const res = await fetch(`${API}/link-request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ playerId }),
  });

  const data = await res.json();
  out(data);
  if (data.message) {
    alert("Request Sent! Ask Admin to approve.");
    document.getElementById("link-section").classList.add("hidden");
  }
}

// --- APPROVALS (ADMIN SIDE) ---
async function loadApprovals() {
  const res = await fetch(`${API}/admin-approvals`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const requests = await res.json();

  const box = document.getElementById("approval-box");
  const list = document.getElementById("approval-list");
  list.innerHTML = "";

  if (requests.length > 0) {
    box.classList.remove("hidden");
    requests.forEach((req) => {
      const div = document.createElement("div");
      div.className = "flex-between";
      div.style =
        "background:#334155; padding:10px; border-radius:6px; margin-top:5px; font-size:14px;";
      div.innerHTML = `
        <span><b>${req.username}</b> wants to be <b>${req.players.name}</b></span>
        <button onclick="approveUser('${req.id}')" style="width:auto; padding:5px 10px; font-size:12px; background:#22c55e; margin:0;">Approve</button>
      `;
      list.appendChild(div);
    });
  } else {
    box.classList.add("hidden");
  }
}

async function approveUser(targetUserId) {
  const res = await fetch(`${API}/admin-approvals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ targetUserId }),
  });
  const data = await res.json();
  out(data);
  loadApprovals(); // Refresh list
}

// --- STANDARD LOADERS ---
async function loadTeams() {
  const res = await fetch(`${API}/teams`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const teams = await res.json();

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
  out(teams);
}

async function loadPlayers() {
  const res = await fetch(`${API}/players`);
  out(await res.json());
}

// --- ACTIONS (ADMIN) ---
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
  out(await res.json());
  loadMatches();
}

async function loadMatches() {
  const res = await fetch(`${API}/matches`);
  const matches = await res.json();
  const container = document.getElementById("matches-list");
  if (!container) return;
  container.innerHTML = "";

  if (!matches || matches.length === 0) {
    container.innerHTML =
      "<div style='color:#64748b; text-align:center; padding:20px;'>No matches scheduled</div>";
    return;
  }

  matches.forEach((m) => {
    const date = new Date(m.start_time).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div style="font-size:13px; color:#94a3b8; margin-bottom:8px;">${date}</div>
      <div class="flex-between" style="font-weight:700; font-size:18px;">
        <span style="color:#cbd5e1;">${m.team_a_name}</span>
        <span style="color:#22c55e; font-size:14px;">VS</span>
        <span style="color:#cbd5e1;">${m.team_b_name}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

// Run
init();
