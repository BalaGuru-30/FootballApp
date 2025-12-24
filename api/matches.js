const { supabase } = require("./_supabase");

function getUser(req) {
  try {
    const auth = req.headers.authorization;
    return JSON.parse(Buffer.from(auth.split(" ")[1], "base64").toString());
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const user = getUser(req);
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
};
