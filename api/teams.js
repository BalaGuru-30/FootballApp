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
    let query = supabase
      .from("teams")
      .select("*, team_players(players(*))")
      .eq("tournament_id", tournamentId)
      .order("name");
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (!user || !user.isAdmin)
    return res.status(403).json({ error: "Admin only" });

  if (req.method === "POST") {
    const { name, tournamentId: tid, jerseyColor } = req.body;
    const { error } = await supabase
      .from("teams")
      .insert({
        name,
        tournament_id: tid,
        jersey_color: jerseyColor || "#ffffff",
      });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Team created" });
  }

  if (req.method === "PUT") {
    const { action, teamId, name, playerId } = req.body;

    if (action === "rename") {
      const { error } = await supabase
        .from("teams")
        .update({ name })
        .eq("id", teamId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Renamed" });
    }

    if (action === "add_player") {
      const { error } = await supabase
        .from("team_players")
        .insert({ team_id: teamId, player_id: playerId });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Player added" });
    }
  }

  // NEW: Delete Team
  if (req.method === "DELETE") {
    const { id } = req.body;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Deleted" });
  }
};
