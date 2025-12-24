const bcrypt = require("bcryptjs");
const { supabase } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: "Invalid credentials" });

  const token = Buffer.from(
    JSON.stringify({
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin,
    })
  ).toString("base64");

  res.json({ token });
};
