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

  // GET: Public - List all players
  if (req.method === "GET") {
    const { data } = await supabase.from("players").select("*").order("name");
    return res.json(data);
  }

  // ALL OTHER METHODS: ADMIN ONLY
  if (!user || !user.isAdmin)
    return res.status(403).json({ error: "Admin only" });

  // POST: Create Player
  if (req.method === "POST") {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const { data, error } = await supabase
      .from("players")
      .insert({ name })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // DELETE: Remove Player
  if (req.method === "DELETE") {
    const { id } = req.body;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Deleted" });
  }
};
