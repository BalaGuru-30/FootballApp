const { supabase } = require("./_supabase");

module.exports = async function handler(req, res) {
  const { tournamentId, matchId } = req.query;

  // GET MATCHES
  if (req.method === "GET") {
    let query = supabase
      .from("matches")
      .select(
        `*, 
        team_a:teams!team_a_id(name, jersey_color), 
        team_b:teams!team_b_id(name, jersey_color)`
      )
      .eq("tournament_id", tournamentId)
      .order("match_order", { ascending: true });

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Flatten structure for frontend convenience
    const formatted = data.map((m) => ({
      ...m,
      team_a_name: m.team_a?.name || "Unknown",
      team_b_name: m.team_b?.name || "Unknown",
    }));

    return res.json(formatted);
  }

  // POST: Create Match
  if (req.method === "POST") {
    const {
      teamAId,
      teamBId,
      startTime,
      tournamentId: tId,
      matchType,
    } = req.body;

    // Get max order
    const { data: maxData } = await supabase
      .from("matches")
      .select("match_order")
      .eq("tournament_id", tId)
      .order("match_order", { ascending: false })
      .limit(1);

    const nextOrder =
      maxData && maxData.length > 0 ? maxData[0].match_order + 1 : 1;

    const { data, error } = await supabase
      .from("matches")
      .insert({
        team_a_id: teamAId,
        team_b_id: teamBId,
        start_time: startTime,
        tournament_id: tId,
        match_type: matchType || "normal",
        status: "scheduled",
        match_order: nextOrder,
      })
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data[0]);
  }

  // PUT: Update Score, Reorder, or RESET
  if (req.method === "PUT") {
    const { matchId, scoreA, scoreB, newOrder, teamAId, teamBId, action } =
      req.body;

    // --- RESET MATCH LOGIC ---
    if (action === "reset") {
      const { error } = await supabase
        .from("matches")
        .update({
          score_a: null,
          score_b: null,
          status: "scheduled",
        })
        .eq("id", matchId);

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Match reset" });
    }
    // -------------------------

    // Update Finals Teams
    if (teamAId && teamBId) {
      const { error } = await supabase
        .from("matches")
        .update({ team_a_id: teamAId, team_b_id: teamBId })
        .eq("id", matchId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Teams updated" });
    }

    // Reorder
    if (newOrder !== undefined) {
      const { error } = await supabase
        .from("matches")
        .update({ match_order: newOrder })
        .eq("id", matchId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Reordered" });
    }

    // Update Score
    const { error } = await supabase
      .from("matches")
      .update({
        score_a: scoreA,
        score_b: scoreB,
        status: "finished",
      })
      .eq("id", matchId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Score updated" });
  }

  // DELETE
  if (req.method === "DELETE") {
    const { id } = req.body;
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Deleted" });
  }
};
