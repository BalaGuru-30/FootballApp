const bcrypt = require("bcryptjs");
const { supabase } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  const { data: user } = await supabase
    .from("users")
    .select("id, username, password, is_admin, player_id")
    .eq("username", username)
    .single();

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = Buffer.from(
    JSON.stringify({
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin,
      playerId: user.player_id,
    })
  ).toString("base64");

  res.json({ token });
};
