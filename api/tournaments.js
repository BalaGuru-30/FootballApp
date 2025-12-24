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

  // GET: List all
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("start_date", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // ADMIN CHECK
  if (!user || !user.isAdmin)
    return res.status(403).json({ error: "Admin only" });

  // POST: Create
  if (req.method === "POST") {
    const { name, startDate, endDate } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const { data, error } = await supabase
      .from("tournaments")
      .insert({ name, start_date: startDate, end_date: endDate })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // PUT: Update
  if (req.method === "PUT") {
    const { id, name, startDate, endDate } = req.body;
    const { error } = await supabase
      .from("tournaments")
      .update({ name, start_date: startDate, end_date: endDate })
      .eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Updated" });
  }

  // DELETE: Remove
  if (req.method === "DELETE") {
    const { id } = req.body;
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Deleted" });
  }
};
