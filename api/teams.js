import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // --- GET TEAMS ---
  if (req.method === "GET") {
    const { tournamentId } = req.query;
    if (!tournamentId)
      return res.status(400).json({ error: "Missing tournamentId" });

    const { data, error } = await supabase
      .from("teams")
      .select("*, team_players(player_id, players(name))")
      .eq("tournament_id", tournamentId)
      .order("name", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // --- CREATE TEAM ---
  if (req.method === "POST") {
    const { name, tournamentId, jerseyColor } = req.body;
    const { data, error } = await supabase
      .from("teams")
      .insert([
        { name, tournament_id: tournamentId, jersey_color: jerseyColor },
      ])
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data[0]);
  }

  // --- UPDATE / MANAGE TEAM ---
  if (req.method === "PUT") {
    const { action, teamId, playerId, name, jerseyColor } = req.body;

    if (action === "add_player") {
      const { error } = await supabase
        .from("team_players")
        .insert([{ team_id: teamId, player_id: playerId }]);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    if (action === "remove_player") {
      // BUG FIX: Correctly targeting the row in the junction table
      const { error } = await supabase
        .from("team_players")
        .delete()
        .match({ team_id: teamId, player_id: playerId }); // Ensures we only delete this specific link

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    if (action === "edit") {
      const { error } = await supabase
        .from("teams")
        .update({ name, jersey_color: jerseyColor })
        .eq("id", teamId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
  }

  // --- DELETE TEAM ---
  if (req.method === "DELETE") {
    const { id } = req.body;
    // Delete matches first (optional depending on cascade settings, but safer)
    await supabase
      .from("matches")
      .delete()
      .or(`team_a_id.eq.${id},team_b_id.eq.${id}`);
    await supabase.from("team_players").delete().eq("team_id", id);

    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }
}
