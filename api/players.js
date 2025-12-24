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

  // GET: All Global Players
  if (req.method === "GET") {
    const { data } = await supabase.from("players").select("*").order("name");
    return res.json(data);
  }

  // POST: Create Global Player
  if (req.method === "POST") {
    if (!user || !user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    // Return the created player so we can use ID immediately
    const { data, error } = await supabase
      .from("players")
      .insert({ name })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
};
