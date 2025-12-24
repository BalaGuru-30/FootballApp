import bcrypt from "bcryptjs";
import { supabase } from "./_supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Stateless token (simple)
  const token = Buffer.from(
    JSON.stringify({ id: user.id, isAdmin: user.is_admin })
  ).toString("base64");

  res.json({
    token,
    isAdmin: user.is_admin,
  });
}
