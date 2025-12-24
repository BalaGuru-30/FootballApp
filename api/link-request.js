const { supabase } = require("./_supabase");

// Helper: Safe User Extraction
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
  if (req.method !== "POST") return res.status(405).end();

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: "Player ID required" });

  // Update user: Link player, set verified to false
  const { error } = await supabase
    .from("users")
    .update({
      player_id: playerId,
      is_verified: false,
    })
    .eq("id", user.userId);

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ message: "Request sent to Admin" });
};
