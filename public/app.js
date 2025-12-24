const API = "/api";
let token = localStorage.getItem("token");
let user = null;

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");

if (token) {
  user = JSON.parse(atob(token));
  showDashboard();
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");

  if (user?.isAdmin) {
    const adminBtn = document.createElement("button");
    adminBtn.innerText = "➕ Create Match";
    adminBtn.onclick = createMatch;
    dashboard.prepend(adminBtn);
  }
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (data.token) {
    token = data.token;
    user = JSON.parse(atob(token));
    localStorage.setItem("token", token);
    showDashboard();
  } else {
    document.getElementById("login-error").innerText = data.error;
  }
}

function logout() {
  localStorage.removeItem("token");
  location.reload();
}

async function loadPlayers() {
  const res = await fetch(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const players = await res.json();
  const content = document.getElementById("content");
  content.innerHTML = "<h3>Players</h3>";

  players.forEach((p) => {
    content.innerHTML += `<div class="card">${p.name}</div>`;
  });
}

async function loadMatches() {
  const res = await fetch(`${API}/matches`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const matches = await res.json();
  const content = document.getElementById("content");
  content.innerHTML = "<h3>Matches</h3>";

  matches.forEach((m) => {
    content.innerHTML += `
      <div class="card">
        <strong>${m.team_a} vs ${m.team_b}</strong>
        <div class="score">
          ${m.score_a}
          ${
            user?.isAdmin
              ? `<button onclick="updateScore('${m.id}','A',1)">➕</button>
          <button onclick="updateScore('${m.id}','A',-1)">➖</button>`
              : ""
          }
          :
          ${
            user?.isAdmin
              ? `<button onclick="updateScore('${m.id}','B',1)">➕</button>
          <button onclick="updateScore('${m.id}','B',-1)">➖</button>`
              : ""
          }
          ${m.score_b}
        </div>
      </div>
    `;
  });
}

async function createMatch() {
  await fetch(`${API}/matches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  loadMatches();
}

async function updateScore(matchId, team, delta) {
  await fetch(`${API}/score`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ matchId, team, delta }),
  });
  loadMatches();
}
