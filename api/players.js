const { supabase } = require("./_supabase");

function getUser(req) {
  try {
    const auth = req.headers.authorization;
    return JSON.parse(Buffer.from(auth.split(" ")[1], "base64").toString());
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const { data } = await supabase.from("players").select("*");
    return res.json(data);
  }

  if (req.method === "POST") {
    if (!user.isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    const { name } = req.body;
    const { data, error } = await supabase
      .from("players")
      .insert({ name })
      .select()
      .single();

    if (error) return res.status(400).json(error);
    return res.json(data);
  }

  res.status(405).end();
};
