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

  const { data } = await supabase
    .from("user_details")
    .select("*")
    .eq("user_id", user.userId)
    .single();

  res.json(data);
};
