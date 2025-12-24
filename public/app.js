const API = "/api";

let token = localStorage.getItem("token");
let user = null;
let foundPlayer = null;

// DOM references
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const linkScreen = document.getElementById("link-player-screen");
const content = document.getElementById("content");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

// Auto-login if token exists
if (token) {
  user = JSON.parse(atob(token));
  checkPlayerLink();
}

/* ---------------- AUTH ---------------- */

async function login() {
  const username = usernameInput.value;
  const password = passwordInput.value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!data.token) {
    alert(data.error);
    return;
  }

  token = data.token;
  user = JSON.parse(atob(token));
  localStorage.setItem("token", token);

  await checkPlayerLink();
}

async function signup() {
  const username = usernameInput.value;
  const password = passwordInput.value;

  await fetch(`${API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  await login();
}

function logout() {
  localStorage.removeItem("token");
  location.reload();
}

/* ---------------- PLAYER LINKING ---------------- */

async function checkPlayerLink() {
  if (user.playerId) {
    showDashboard();
    return;
  }

  const res = await fetch(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const players = await res.json();
  foundPlayer = players.find((p) => p.name === user.username);

  if (foundPlayer) {
    loginScreen.classList.add("hidden");
    linkScreen.classList.remove("hidden");
    document.getElementById(
      "player-question"
    ).innerText = `A player named ${foundPlayer.name} already exists. Are you this player?`;
  } else {
    showDashboard();
  }
}

async function confirmLink() {
  await fetch(`${API}/link-player`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ playerId: foundPlayer.id }),
  });

  showDashboard();
}

function skipLink() {
  showDashboard();
}

/* ---------------- DASHBOARD ---------------- */

function showDashboard() {
  loginScreen.classList.add("hidden");
  linkScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");

  content.innerHTML = `
    <div class="card">
      Logged in as <b>${user.username}</b>
      ${user.isAdmin ? " (Admin)" : ""}
    </div>
  `;
}

/* ---------------- PLAYERS ---------------- */

async function loadPlayers() {
  const res = await fetch(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const players = await res.json();
  content.innerHTML = "<h3>Players</h3>";

  players.forEach((p) => {
    content.innerHTML += `<div class="card">${p.name}</div>`;
  });
}

/* ---------------- MATCHES ---------------- */

async function loadMatches() {
  const res = await fetch(`${API}/matches`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const matches = await res.json();
  content.innerHTML = "<h3>Matches</h3>";

  matches.forEach((m) => {
    content.innerHTML += `
      <div class="card">
        ${m.team_a} vs ${m.team_b}<br/>
        ${m.score_a} : ${m.score_b}
      </div>
    `;
  });
}
