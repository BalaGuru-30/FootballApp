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

    const { data: teams } = await supabase.from("teams").select("*").limit(2);
    if (teams.length < 2) {
      return res.status(400).json({ error: "Need 2 teams" });
    }

    const { data } = await supabase
      .from("matches")
      .insert({
        team_a: teams[0].id,
        team_b: teams[1].id,
      })
      .select()
      .single();

    return res.json(data);
  }

  if (req.method === "GET") {
    const { data } = await supabase.from("matches").select("*");
    return res.json(data);
  }

  res.status(405).end();
}
