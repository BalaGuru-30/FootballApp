import { supabase } from "./_supabase";

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  return JSON.parse(Buffer.from(auth.split(" ")[1], "base64").toString());
}

export default async function handler(req, res) {
  const user = getUserFromToken(req);
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
}
