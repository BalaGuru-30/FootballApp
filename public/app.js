const API = "/api";
let token = localStorage.getItem("token");

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");

if (token) {
  showDashboard();
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
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
        <strong>${m.team_a} vs ${m.team_b}</strong><br/>
        ${m.score_a} : ${m.score_b}
      </div>
    `;
  });
}
