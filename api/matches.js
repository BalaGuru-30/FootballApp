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
  const user = getUser(req);

  // GET: Public - View All Matches
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // POST: Admin Only - Schedule Match
  if (req.method === "POST") {
    if (!user || !user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    const { teamAId, teamBId, startTime } = req.body;

    if (!teamAId || !teamBId || !startTime) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (teamAId === teamBId) {
      return res.status(400).json({ error: "Cannot play against self" });
    }

    // 1. Fetch team names first (for display efficiency)
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", [teamAId, teamBId]);

    const teamA = teams.find((t) => t.id === teamAId);
    const teamB = teams.find((t) => t.id === teamBId);

    if (!teamA || !teamB)
      return res.status(400).json({ error: "Teams not found" });

    // 2. Insert Match
    const { data, error } = await supabase
      .from("matches")
      .insert({
        team_a_id: teamAId,
        team_b_id: teamBId,
        team_a_name: teamA.name,
        team_b_name: teamB.name,
        start_time: startTime,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  return res.status(405).json({ error: "Method not allowed" });
};
