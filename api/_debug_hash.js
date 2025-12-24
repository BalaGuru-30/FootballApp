const bcrypt = require("bcryptjs");

module.exports = async function handler(req, res) {
  const hash = bcrypt.hashSync("Halamadrid@123", 10);
  res.json({ hash });
};
