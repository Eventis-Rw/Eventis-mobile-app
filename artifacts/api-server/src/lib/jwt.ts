import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "eventis-dev-secret-change-in-prod";
const JWT_EXPIRY = "7d";

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
