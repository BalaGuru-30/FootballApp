const bcrypt = require("bcryptjs");
const { supabase } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  const hash = bcrypt.hashSync(password, 10);

  const { error } = await supabase.from("users").insert({
    username,
    password: hash,
    is_admin: false,
  });

  if (error) return res.status(400).json({ error: "User already exists" });

  res.json({ message: "Signup successful" });
};
