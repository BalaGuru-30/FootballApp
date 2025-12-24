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
  if (req.method !== "POST") return res.status(405).end();
  const user = getUser(req);
  if (!user || !user.isAdmin)
    return res.status(403).json({ error: "Admin only" });

  const { tournamentId, action, rounds } = req.body;

  // 1. CLEAR FIXTURES
  if (action === "clear") {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Fixtures Cleared" });
  }

  // 2. GENERATE FIXTURES
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId);
  if (teams.length < 2) return res.status(400).json({ error: "Need 2+ teams" });

  const matches = [];
  const loopCount = rounds || 1; // Default 1 round

  for (let r = 0; r < loopCount; r++) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        // Swap Home/Away every round to balance it
        const tA = r % 2 === 0 ? teams[i] : teams[j];
        const tB = r % 2 === 0 ? teams[j] : teams[i];

        matches.push({
          tournament_id: tournamentId,
          team_a_id: tA.id,
          team_b_id: tB.id,
          team_a_name: tA.name,
          team_b_name: tB.name,
          start_time: new Date().toISOString(), // Admin will edit dates later
          match_order: matches.length + 1, // Simple ordering
        });
      }
    }
  }

  const { error } = await supabase.from("matches").insert(matches);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: `Generated ${matches.length} matches!` });
};
