const { supabase } = require("./_supabase");

function getUser(req) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return null;
    const token = auth.split(" ")[1];
    return JSON.parse(Buffer.from(token, "base64").toString());
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const user = getUser(req);
  if (!user || !user.isAdmin)
    return res.status(403).json({ error: "Admin only" });

  // GET: View Pending Requests
  if (req.method === "GET") {
    // We need user name AND player name.
    // Supabase standard join syntax:
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id, 
        username, 
        is_verified, 
        players ( id, name )
      `
      )
      .not("player_id", "is", null)
      .eq("is_verified", false);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // POST: Approve User
  if (req.method === "POST") {
    const { targetUserId } = req.body;

    const { error } = await supabase
      .from("users")
      .update({ is_verified: true })
      .eq("id", targetUserId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "User Approved" });
  }
};
