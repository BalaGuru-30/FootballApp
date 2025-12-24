const API = "/api";
let token = localStorage.getItem("token");
let user = null;
let foundPlayer = null;

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const linkScreen = document.getElementById("link-player-screen");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

if (token) {
  user = JSON.parse(atob(token));
  showDashboard();
}

async function login() {
  const username = usernameInput.value;
  const password = passwordInput.value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!data.token) return alert(data.error);

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
  login();
}

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
    ).innerText = `A player named ${foundPlayer.name} exists. Are you this player?`;
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

function showDashboard() {
  loginScreen.classList.add("hidden");
  linkScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
}
