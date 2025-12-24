function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;

  try {
    const token = auth.split(" ")[1];
    return JSON.parse(Buffer.from(token, "base64").toString());
  } catch {
    return null;
  }
}
