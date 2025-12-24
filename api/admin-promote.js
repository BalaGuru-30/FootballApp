const { supabase } = require("./_supabase");

function getUser(req) {
  try {
    return JSON.parse(
      Buffer.from(req.headers.authorization.split(" ")[1], "base64").toString()
    );
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const user = getUser(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Admin only" });
  }

  const { userId } = req.body;

  await supabase.from("users").update({ is_admin: true }).eq("id", userId);

  res.json({ message: "User promoted to admin" });
};
