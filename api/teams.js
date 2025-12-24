import { supabase } from "./_supabase";

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  return JSON.parse(Buffer.from(auth.split(" ")[1], "base64").toString());
}

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "POST") {
    if (!user.isAdmin) return res.status(403).json({ error: "Admin only" });

    const { name, color, playerIds } = req.body;

    const { data: team } = await supabase
      .from("teams")
      .insert({ name, color })
      .select()
      .single();

    const links = playerIds.map((pid) => ({
      team_id: team.id,
      player_id: pid,
    }));

    await supabase.from("team_players").insert(links);
    return res.json(team);
  }

  if (req.method === "GET") {
    const { data } = await supabase.from("teams").select(`
      id, name, color, points,
      team_players(player_id)
    `);
    return res.json(data);
  }

  res.status(405).end();
}
