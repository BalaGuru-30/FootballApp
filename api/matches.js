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

  if (!user || !user.isAdmin)
    return res.status(403).json({ error: "Admin only" });

  if (req.method === "POST") {
    const {
      teamAId,
      teamBId,
      startTime,
      tournamentId: bodyTournId,
      matchType,
    } = req.body;

    if (!teamAId || !teamBId)
      return res.status(400).json({ error: "Select teams" });

    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", [teamAId, teamBId]);
    const teamA = teams.find((t) => t.id === teamAId);
    const teamB = teams.find((t) => t.id === teamBId);

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
        match_type: matchType || "normal",
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // PUT: Update Score, Order, OR TEAMS (For Finals Update)
  if (req.method === "PUT") {
    const { matchId, scoreA, scoreB, newOrder, teamAId, teamBId } = req.body;

    let updateData = {};

    // Scenario 1: Update Teams (Auto-Finals update)
    if (teamAId && teamBId) {
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", [teamAId, teamBId]);
      const tA = teams.find((t) => t.id === teamAId);
      const tB = teams.find((t) => t.id === teamBId);
      updateData = {
        team_a_id: teamAId,
        team_b_id: teamBId,
        team_a_name: tA.name,
        team_b_name: tB.name,
      };
    }
    // Scenario 2: Reorder
    else if (newOrder !== undefined) {
      updateData = { match_order: newOrder };
    }
    // Scenario 3: Score Update
    else {
      updateData = { score_a: scoreA, score_b: scoreB, status: "finished" };
    }

    const { data, error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", matchId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Deleted" });
  }
};
