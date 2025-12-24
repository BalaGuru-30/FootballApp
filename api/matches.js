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
  const { tournamentId } = req.query;

  // GET: Sorted by Order
  if (req.method === "GET") {
    if (!tournamentId) return res.json([]);
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("match_order", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // POST: Create
  if (req.method === "POST") {
    if (!user || !user.isAdmin)
      return res.status(403).json({ error: "Admin only" });
    const { teamAId, teamBId, startTime, tournamentId: bodyTournId } = req.body;

    // Fetch names
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", [teamAId, teamBId]);
    const teamA = teams.find((t) => t.id === teamAId);
    const teamB = teams.find((t) => t.id === teamBId);

    // Get max order to put at bottom
    const { data: max } = await supabase
      .from("matches")
      .select("match_order")
      .eq("tournament_id", bodyTournId)
      .order("match_order", { ascending: false })
      .limit(1)
      .single();
    const newOrder = (max?.match_order || 0) + 1;

    const { data, error } = await supabase
      .from("matches")
      .insert({
        tournament_id: bodyTournId,
        team_a_id: teamAId,
        team_b_id: teamBId,
        team_a_name: teamA.name,
        team_b_name: teamB.name,
        start_time: startTime,
        match_order: newOrder,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // PUT: Update Score OR Reorder
  if (req.method === "PUT") {
    if (!user || !user.isAdmin)
      return res.status(403).json({ error: "Admin only" });
    const { matchId, scoreA, scoreB, newOrder } = req.body;

    let updateData = {};
    if (newOrder !== undefined) updateData = { match_order: newOrder };
    else updateData = { score_a: scoreA, score_b: scoreB, status: "finished" };

    const { data, error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", matchId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // DELETE: Remove Match
  if (req.method === "DELETE") {
    if (!user || !user.isAdmin)
      return res.status(403).json({ error: "Admin only" });
    const { id } = req.body;
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Deleted" });
  }
};
