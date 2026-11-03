const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getAdminByUsername } = require("./db");
require("dotenv").config({ path: ".env.local" });

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEON_REALTIME_SECRET || "maryam-secret-key-2026";

async function loginAdmin(username, password) {
  if (!username || !password) {
    throw new Error("Username and password are required.");
  }

  const user = await getAdminByUsername(username);
  if (!user) {
    throw new Error("Invalid username or password.");
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new Error("Invalid username or password.");
  }

  // Issue token valid for 7 days
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: "Invalid or expired token." });
  }

  req.user = decoded;
  next();
}

module.exports = {
  loginAdmin,
  verifyToken,
  requireAuth,
};

