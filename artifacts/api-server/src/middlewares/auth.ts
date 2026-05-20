import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";

export interface AuthRequest extends Request {
  userId: number;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
  (req as AuthRequest).userId = payload.userId;
  next();
}
