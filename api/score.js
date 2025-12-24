import { supabase } from "./_supabase";

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  return JSON.parse(Buffer.from(auth.split(" ")[1], "base64").toString());
}

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Admin only" });
  }

  const { matchId, team, delta } = req.body;

  const { error } = await supabase.rpc("increment_score", {
    match_id: matchId,
    team,
    delta,
  });

  if (error) {
    return res.status(400).json(error);
  }

  res.json({ success: true });
}
