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
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { playerId } = req.body;

  await supabase
    .from("users")
    .update({ player_id: playerId })
    .eq("id", user.userId);

  res.json({ message: "Player linked" });
};
