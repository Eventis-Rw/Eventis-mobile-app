import { db, savedEventsTable, usersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

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

router.get("/users/me", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  const savedEvents = await getSavedEventIds(user.id);
  res.json({ user: toClientUser(user, savedEvents) });
});

router.put("/users/me", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({
    username: z.string().min(2).max(50).optional(),
    bio: z.string().max(200).optional(),
    phone: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid input" }); return; }
  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, userId))
    .returning();
  const savedEvents = await getSavedEventIds(user.id);
  res.json({ user: toClientUser(user, savedEvents) });
});

router.post("/users/me/business", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({
    businessName: z.string().min(2).max(100),
    type: z.enum(["business", "individual"]),
    website: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid input" }); return; }
  const { businessName, type, website } = parsed.data;
  const [user] = await db
    .update(usersTable)
    .set({
      isBusinessAccount: true,
      businessName,
      businessType: type,
      businessWebsite: website ?? null,
    })
    .where(eq(usersTable.id, userId))
    .returning();
  const savedEvents = await getSavedEventIds(user.id);
  res.json({ user: toClientUser(user, savedEvents) });
});

router.get("/users/me/saved-events", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const savedEvents = await getSavedEventIds(userId);
  res.json({ savedEvents });
});

router.post("/users/me/saved-events/:eventId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const eventId = String(req.params.eventId);
  await db
    .insert(savedEventsTable)
    .values({ userId, eventId })
    .onConflictDoNothing();
  const savedEvents = await getSavedEventIds(userId);
  res.json({ savedEvents });
});

router.delete("/users/me/saved-events/:eventId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const eventId = String(req.params.eventId);
  await db
    .delete(savedEventsTable)
    .where(and(eq(savedEventsTable.userId, userId), eq(savedEventsTable.eventId, eventId)));
  const savedEvents = await getSavedEventIds(userId);
  res.json({ savedEvents });
});

export default router;
