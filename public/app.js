const API = "/api";

let token = localStorage.getItem("token");
let user = null;
let foundPlayer = null;

// DOM
const loginScreen = document.getElementById("login-screen");
const linkScreen = document.getElementById("link-player-screen");
const dashboard = document.getElementById("dashboard");
const content = document.getElementById("content");
const adminActions = document.getElementById("admin-actions");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

// Auto login
if (token) {
  user = JSON.parse(atob(token));
  checkPlayerLink();
}

/* ---------- AUTH ---------- */

async function login() {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernameInput.value,
      password: passwordInput.value,
    }),
  });

  const data = await res.json();
  if (!data.token) {
    document.getElementById("login-error").innerText = data.error;
    return;
  }

  token = data.token;
  user = JSON.parse(atob(token));
  localStorage.setItem("token", token);

  await checkPlayerLink();
}

async function signup() {
  await fetch(`${API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernameInput.value,
      password: passwordInput.value,
    }),
  });

  await login();
}

function logout() {
  localStorage.removeItem("token");
  location.reload();
}

/* ---------- PLAYER LINK ---------- */

async function checkPlayerLink() {
  if (user.playerId) return showDashboard();

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

/* ---------- DASHBOARD ---------- */

function showDashboard() {
  loginScreen.classList.add("hidden");
  linkScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");

  if (user.isAdmin) adminActions.classList.remove("hidden");
}

/* ---------- ADMIN ACTIONS ---------- */

async function addPlayer() {
  const name = prompt("Enter player name:");
  if (!name) return;

  await fetch(`${API}/players`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  loadPlayers();
}

async function addTeam() {
  const name = prompt("Enter team name:");
  if (!name) return;

  await fetch(`${API}/teams`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  loadTeams();
}

/* ---------- VIEWS ---------- */

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

async function loadTeams() {
  const res = await fetch(`${API}/teams`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const teams = await res.json();
  content.innerHTML = "<h3>Teams</h3>";

  teams.forEach((t) => {
    content.innerHTML += `<div class="card">${t.name}</div>`;
  });
}
