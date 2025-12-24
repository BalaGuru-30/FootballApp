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

  if (action === "clear") {
    await supabase.from("matches").delete().eq("tournament_id", tournamentId);
    return res.json({ message: "Fixtures Cleared" });
  }

  // 1. Get Teams
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId);
  if (teams.length < 2) return res.status(400).json({ error: "Need 2+ teams" });

  let schedule = [];
  const teamIds = teams.map((t) => t.id);

  // Add "Dummy" team if odd number (Standard scheduling trick)
  if (teamIds.length % 2 !== 0) {
    teamIds.push(null);
  }

  const numTeams = teamIds.length;
  const matchesPerRound = numTeams / 2;
  const totalRounds = numTeams - 1;
  const loopCount = rounds || 1;

  // 2. Generate Rounds (Circle Method Algorithm)
  for (let loop = 0; loop < loopCount; loop++) {
    for (let round = 0; round < totalRounds; round++) {
      for (let match = 0; match < matchesPerRound; match++) {
        const home = teamIds[match];
        const away = teamIds[numTeams - 1 - match];

        if (home && away) {
          // Don't schedule dummy matches
          // Swap home/away every loop to balance home/away games
          const realHomeId = loop % 2 === 0 ? home : away;
          const realAwayId = loop % 2 === 0 ? away : home;

          const teamA = teams.find((t) => t.id === realHomeId);
          const teamB = teams.find((t) => t.id === realAwayId);

          schedule.push({
            tournament_id: tournamentId,
            team_a_id: teamA.id,
            team_b_id: teamB.id,
            team_a_name: teamA.name,
            team_b_name: teamB.name,
            start_time: new Date().toISOString(),
            match_order: schedule.length + 1,
            match_type: "normal",
          });
        }
      }
      // Rotate the array (keep index 0 fixed, rotate the rest)
      teamIds.splice(1, 0, teamIds.pop());
    }
  }

  const { error } = await supabase.from("matches").insert(schedule);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: `Generated ${schedule.length} matches!` });
};
