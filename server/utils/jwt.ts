import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "RTHC_SECRET_KEY";

export function generateToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}