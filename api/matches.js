const { supabase } = require("./_supabase");

function getUser(req) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return null;
    return JSON.parse(Buffer.from(auth.split(" ")[1], "base64").toString());
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const user = getUser(req);
  const { tournamentId } = req.query;

  // GET: View Matches for specific Tournament
  if (req.method === "GET") {
    if (!tournamentId) return res.json([]);

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("start_time", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // POST: Manual Match Creation
  if (req.method === "POST") {
    if (!user || !user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    const { teamAId, teamBId, startTime, tournamentId: bodyTournId } = req.body;

    if (!teamAId || !teamBId || !startTime || !bodyTournId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", [teamAId, teamBId]);
    const teamA = teams.find((t) => t.id === teamAId);
    const teamB = teams.find((t) => t.id === teamBId);

    const { data, error } = await supabase
      .from("matches")
      .insert({
        tournament_id: bodyTournId,
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
};
