const { supabase } = require("./_supabase");

module.exports = async function handler(req, res) {
  const { tournamentId } = req.query;

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
      team_a_name: m.team_a?.name || m.team_a_name || "Unknown",
      team_b_name: m.team_b?.name || m.team_b_name || "Unknown",
    }));

    return res.json(formatted);
  }

  // POST: Create Match
  if (req.method === "POST") {
    try {
      const {
        teamAId,
        teamBId,
        startTime,
        tournamentId: tId,
        matchType,
      } = req.body;

      // Validation
      if (!teamAId || !teamBId || !tId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // --- FIX: Fetch Team Names ---
      const { data: teams, error: teamError } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", [teamAId, teamBId]);

      if (teamError || !teams) {
        return res.status(400).json({ error: "Invalid Team IDs" });
      }

      const teamA = teams.find((t) => t.id === teamAId);
      const teamB = teams.find((t) => t.id === teamBId);

      if (!teamA || !teamB) {
        return res.status(400).json({ error: "One or both teams not found" });
      }
      // -----------------------------

      // Get max order safely
      const { data: maxData } = await supabase
        .from("matches")
        .select("match_order")
        .eq("tournament_id", tId)
        .order("match_order", { ascending: false })
        .limit(1);

      const nextOrder =
        maxData && maxData.length > 0 ? (maxData[0].match_order || 0) + 1 : 1;

      const { data, error } = await supabase
        .from("matches")
        .insert({
          team_a_id: teamAId,
          team_b_id: teamBId,
          team_a_name: teamA.name, // Explicitly saving name
          team_b_name: teamB.name, // Explicitly saving name
          start_time: startTime || null,
          tournament_id: tId,
          match_type: matchType || "normal",
          status: "scheduled",
          match_order: nextOrder,
        })
        .select();

      if (error) {
        console.error("Insert Error:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data[0]);
    } catch (err) {
      console.error("Server Error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // PUT: Update Score, Reorder, or RESET
  if (req.method === "PUT") {
    const { matchId, scoreA, scoreB, newOrder, teamAId, teamBId, action } =
      req.body;

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

    // Updating Teams (e.g. for Finals)
    if (teamAId && teamBId) {
      // Fetch names for consistency
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", [teamAId, teamBId]);

      const teamA = teams?.find((t) => t.id === teamAId);
      const teamB = teams?.find((t) => t.id === teamBId);

      const { error } = await supabase
        .from("matches")
        .update({
          team_a_id: teamAId,
          team_b_id: teamBId,
          team_a_name: teamA?.name,
          team_b_name: teamB?.name,
        })
        .eq("id", matchId);

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Teams updated" });
    }

    if (newOrder !== undefined) {
      const { error } = await supabase
        .from("matches")
        .update({ match_order: newOrder })
        .eq("id", matchId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Reordered" });
    }

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
