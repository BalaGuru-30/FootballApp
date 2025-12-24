const bcrypt = require("bcryptjs");
const { supabase } = require("./_supabase");

function getUser(req) {
  try {
    const auth = req.headers.authorization;
    return JSON.parse(Buffer.from(auth.split(" ")[1], "base64").toString());
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const user = getUser(req);
  if (!user || !user.isAdmin)
    return res.status(403).json({ error: "Admin only" });

  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing fields" });

  const hash = bcrypt.hashSync(password, 10);

  const { error } = await supabase.from("users").insert({
    username,
    password: hash,
    is_admin: true, // Always true for this endpoint
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: "New Admin Created" });
};
