const { supabase } = require("./_supabase");

function getUser(req) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return null;
    return JSON.parse(Buffer.from(auth.split(" ")[1], "base64").toString());
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const user = getUser(req);
  const { tournamentId } = req.query;

  if (req.method === "GET") {
    if (!tournamentId) return res.json([]);
    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId);
    return res.json(data);
  }

  if (req.method === "POST") {
    if (!user || !user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    // Added jerseyColor here
    const { name, tournamentId: bodyTournId, jerseyColor } = req.body;

    if (!name) return res.status(400).json({ error: "Name required" });

    await supabase.from("teams").insert({
      name,
      tournament_id: bodyTournId,
      jersey_color: jerseyColor || "#ffffff", // Default white
    });
    return res.json({ message: "Team added" });
  }
};
