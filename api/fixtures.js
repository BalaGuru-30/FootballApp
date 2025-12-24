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
  if (req.method !== "POST") return res.status(405).end();

  const user = getUser(req);
  if (!user || !user.isAdmin)
    return res.status(403).json({ error: "Admin only" });

  const { tournamentId } = req.body;
  if (!tournamentId)
    return res.status(400).json({ error: "Tournament ID required" });

  // 1. Get Teams
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (teams.length < 2)
    return res.status(400).json({ error: "Need at least 2 teams" });

  // 2. Generate Round Robin Pairs
  const matches = [];
  // Simple algorithm: Loop through every pair
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        tournament_id: tournamentId,
        team_a_id: teams[i].id,
        team_b_id: teams[j].id,
        team_a_name: teams[i].name,
        team_b_name: teams[j].name,
        start_time: new Date().toISOString(), // Default to "Now", admin can edit later if we add edit
      });
    }
  }

  // 3. Insert All Matches
  const { error } = await supabase.from("matches").insert(matches);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: `Generated ${matches.length} fixtures!` });
};
