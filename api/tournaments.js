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

  // GET: List all tournaments
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // POST: Create Tournament (Admin)
  if (req.method === "POST") {
    if (!user || !user.isAdmin)
      return res.status(403).json({ error: "Admin only" });
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const { data, error } = await supabase
      .from("tournaments")
      .insert({ name })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
};
