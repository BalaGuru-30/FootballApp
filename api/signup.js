const bcrypt = require("bcryptjs");
const { supabase } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  const hash = bcrypt.hashSync(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert({
      username,
      password: hash,
      is_admin: false,
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: "User already exists" });
  }

  res.json({ message: "Signup successful" });
};
