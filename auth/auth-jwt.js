const jwt = require("jsonwebtoken");
const secret = process.env.SECRET;

const verifyReqToken = async (req, res, next) => {
  token = req.headers.authorization;

  if (!token) {
    return res.status(403).send({ error: "Token required" });
  }
  try {
    await verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).send({ error: "Invalid token" });
  }
};

const verifyToken = async (data) => {
  try {
    const decoded = jwt.verify(data, secret);
    if (!(decoded.id && decoded.username && decoded.role)) {
      throw new Error("Invalid token");
    }
    return (data.user = decoded);
  } catch (err) {
    throw err;
  }
};

module.exports = { verifyToken, verifyReqToken };
