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
  const user = getUser(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Admin only" });
  }

  const { matchId, team, delta } = req.body;

  const { error } = await supabase.rpc("increment_score", {
    match_id: matchId,
    team,
    delta,
  });

  if (error) return res.status(400).json(error);

  res.json({ success: true });
};
