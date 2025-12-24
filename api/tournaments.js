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

  if (req.method === "GET") {
    // Sort by date descending
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("tournament_date", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // ADMIN ONLY
  if (!user || !user.isAdmin)
    return res.status(403).json({ error: "Admin only" });

  if (req.method === "POST") {
    const { name, date } = req.body; // Changed to single date
    if (!name) return res.status(400).json({ error: "Name required" });

    const { data, error } = await supabase
      .from("tournaments")
      .insert({ name, tournament_date: date })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === "PUT") {
    const { id, name, date } = req.body;
    const { error } = await supabase
      .from("tournaments")
      .update({ name, tournament_date: date })
      .eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Updated" });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Deleted" });
  }
};
