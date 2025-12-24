const { supabase } = require("./_supabase");

function auth(req) {
  return JSON.parse(
    Buffer.from(req.headers.authorization.split(" ")[1], "base64")
  );
}

module.exports = async (req, res) => {
  const user = auth(req);

  if (req.method === "GET") {
    const { data } = await supabase.from("teams").select("*");
    return res.json(data);
  }

  if (req.method === "POST") {
    if (!user.isAdmin) return res.status(403).json({ error: "Admin only" });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    await supabase.from("teams").insert({ name });
    return res.json({ message: "Team added" });
  }
};
