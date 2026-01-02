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

  // GET
  if (req.method === "GET") {
    // FIX 1: Explicitly select 'player_id' so it's not undefined in the frontend
    let query = supabase
      .from("teams")
      .select("*, team_players(player_id, players(*))")
      .eq("tournament_id", tournamentId)
      .order("name");
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // ADMIN ONLY
  if (!user || !user.isAdmin)
    return res.status(403).json({ error: "Admin only" });

  // POST
  if (req.method === "POST") {
    const { name, tournamentId: tid, jerseyColor } = req.body;
    const { error } = await supabase.from("teams").insert({
      name,
      tournament_id: tid,
      jersey_color: jerseyColor || "#ffffff",
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Team created" });
  }

  // PUT: Rename, Edit Color, Add/Remove Player
  if (req.method === "PUT") {
    const { action, teamId, name, jerseyColor, playerId } = req.body;

    if (action === "edit") {
      const { error } = await supabase
        .from("teams")
        .update({ name, jersey_color: jerseyColor })
        .eq("id", teamId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Team updated" });
    }

    if (action === "add_player") {
      const { error } = await supabase
        .from("team_players")
        .insert({ team_id: teamId, player_id: playerId });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Player added" });
    }

    // FIX 2: Remove Player Logic with explicit .eq() checks
    if (action === "remove_player") {
      const { error } = await supabase
        .from("team_players")
        .delete()
        .eq("team_id", teamId)
        .eq("player_id", playerId);

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Player removed" });
    }
  }

  // DELETE TEAM
  if (req.method === "DELETE") {
    const { id } = req.body;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Deleted" });
  }
};
