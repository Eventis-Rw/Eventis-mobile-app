import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET;
const JWT_EXPIRY = "7d";

if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET is required. Set it in your .env file before starting the API server.");
}

export interface JwtPayload {
  userId: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
