const API = "/api";
let token = localStorage.getItem("token");

function out(msg) {
  document.getElementById("output").textContent = JSON.stringify(msg, null, 2);
}

async function login() {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.value,
      password: password.value,
    }),
  });
  const data = await res.json();
  if (data.token) {
    token = data.token;
    localStorage.setItem("token", token);
  }
  out(data);
}

async function signup() {
  const res = await fetch(`${API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.value,
      password: password.value,
    }),
  });
  out(await res.json());
}

async function loadPlayers() {
  const res = await fetch(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  out(await res.json());
}

async function loadTeams() {
  const res = await fetch(`${API}/teams`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  out(await res.json());
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
}
