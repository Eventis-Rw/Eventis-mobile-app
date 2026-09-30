import { db, savedEventsTable, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { signToken } from "../lib/jwt";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

const otpStore = new Map<number, { code: string; expiry: number }>();

type UserRow = typeof usersTable.$inferSelect;

async function getSavedEventIds(userId: number): Promise<string[]> {
  const rows = await db
    .select({ eventId: savedEventsTable.eventId })
    .from(savedEventsTable)
    .where(eq(savedEventsTable.userId, userId));
  return rows.map((r) => r.eventId);
}

function toClientUser(user: UserRow, savedEvents: string[]) {
  const { passwordHash: _ph, ...rest } = user;
  return {
    ...rest,
    id: rest.id.toString(),
    joinedDate: rest.joinedDate.toISOString(),
    createdAt: rest.createdAt.toISOString(),
    savedEvents,
  };
}

router.post("/auth/register", async (req: Request, res: Response) => {
  const schema = z.object({
    username: z.string().min(2).max(50),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(8).optional(),
    password: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const { username, email, phone, password } = parsed.data;
  const cleanPhone = phone?.trim();

  if (!cleanPhone) {
    res.status(400).json({ message: "Phone number is required" });
    return;
  }

  const normalizedEmail = email?.trim() || `${username.trim().toLowerCase()}-${cleanPhone.replace(/\D/g, "").slice(-6)}@eventis.local`;
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.email, normalizedEmail), eq(usersTable.phone, cleanPhone)))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ message: "Phone number or email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ username, email: normalizedEmail, phone: cleanPhone, passwordHash })
    .returning();

  const token = signToken({ userId: user.id });
  res.json({ token, user: toClientUser(user, []) });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const schema = z.object({ identifier: z.string(), password: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const { identifier, password } = parsed.data;
  const cleanIdentifier = identifier.trim();
  const normalizedPhone = cleanIdentifier.replace(/\D/g, "");

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      or(
        eq(usersTable.username, cleanIdentifier),
        eq(usersTable.email, cleanIdentifier),
        eq(usersTable.phone, cleanIdentifier),
        eq(usersTable.phone, normalizedPhone)
      )
    )
    .limit(1);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const savedEvents = await getSavedEventIds(user.id);
  const token = signToken({ userId: user.id });
  res.json({ token, user: toClientUser(user, savedEvents) });
});

router.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  const savedEvents = await getSavedEventIds(user.id);
  res.json({ user: toClientUser(user, savedEvents) });
});

router.post("/auth/logout", (_req: Request, res: Response) => {
  res.json({ message: "Logged out" });
});

router.post("/auth/request-otp", requireAuth, (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(userId, { code, expiry: Date.now() + 5 * 60 * 1000 });
  req.log.info({ userId }, "OTP generated for user");
  res.json({ message: "OTP sent" });
});

router.post("/auth/verify-otp", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({ code: z.string().length(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Code must be 6 digits" });
    return;
  }
  const { code } = parsed.data;

  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ message: "Invalid OTP format" });
    return;
  }

  const stored = otpStore.get(userId);
  const isExpired = stored && Date.now() > stored.expiry;
  const isMatch = stored && code === stored.code && !isExpired;

  if (stored && !isMatch) {
    res.status(400).json({ message: "Invalid or expired OTP" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ isPhoneVerified: true })
    .where(eq(usersTable.id, userId))
    .returning();

  otpStore.delete(userId);
  const savedEvents = await getSavedEventIds(user.id);
  res.json({ user: toClientUser(user, savedEvents) });
});

export default router;
