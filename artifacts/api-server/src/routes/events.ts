import { db, eventsTable, usersTable } from "@workspace/db";
import { and, eq, ilike, or } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

function toClientEvent(event: typeof eventsTable.$inferSelect) {
  return {
    ...event,
    createdAt: event.createdAt.toISOString(),
  };
}

router.get("/events", async (req: Request, res: Response) => {
  const { category, featured, search, sponsored } = req.query as Record<string, string>;

  let query = db.select().from(eventsTable);
  const conditions = [];

  if (category && category !== "All") {
    conditions.push(eq(eventsTable.category, category));
  }
  if (featured === "true") {
    conditions.push(eq(eventsTable.isFeatured, true));
  }
  if (sponsored === "true") {
    conditions.push(eq(eventsTable.isSponsored, true));
  }
  if (search) {
    const q = `%${search}%`;
    conditions.push(
      or(
        ilike(eventsTable.title, q),
        ilike(eventsTable.description, q),
        ilike(eventsTable.location, q),
        ilike(eventsTable.organizer, q)
      )!
    );
  }

  const events = conditions.length
    ? await db.select().from(eventsTable).where(and(...conditions))
    : await db.select().from(eventsTable);

  res.json({ events: events.map(toClientEvent) });
});

router.get("/events/:id", async (req: Request, res: Response) => {
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, String(req.params.id)))
    .limit(1);
  if (!event) { res.status(404).json({ message: "Event not found" }); return; }
  res.json({ event: toClientEvent(event) });
});

router.post("/events", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const [currentUser] = await db
    .select({ isBusinessAccount: usersTable.isBusinessAccount })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!currentUser?.isBusinessAccount) {
    res.status(403).json({ message: "Business account required to create events" });
    return;
  }

  const schema = z.object({
    id: z.string().optional(),
    title: z.string().min(3).max(200),
    category: z.string(),
    description: z.string().min(10),
    location: z.string(),
    city: z.string(),
    date: z.string(),
    time: z.string(),
    endTime: z.string(),
    price: z.number().int().min(0).default(0),
    currency: z.string().default("GBP"),
    capacity: z.number().int().min(1),
    image: z.string().default("concert"),
    tags: z.array(z.string()).default([]),
    isPaid: z.boolean().default(false),
    organizerWebsite: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid event data" }); return; }

  const eventId = parsed.data.id ?? `usr-${userId}-${Date.now()}`;
  const [user] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const [event] = await db
    .insert(eventsTable)
    .values({
      ...parsed.data,
      id: eventId,
      organizer: user?.username ?? "Unknown",
      organizerId: userId,
      organizerWebsite: parsed.data.organizerWebsite ?? null,
    })
    .returning();

  res.status(201).json({ event: toClientEvent(event) });
});

router.put("/events/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const eventId = String(req.params.id);
  const [existing] = await db
    .select({ organizerId: eventsTable.organizerId })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (!existing) { res.status(404).json({ message: "Event not found" }); return; }
  if (existing.organizerId !== userId) { res.status(403).json({ message: "Not authorized" }); return; }

  const [event] = await db
    .update(eventsTable)
    .set(req.body)
    .where(eq(eventsTable.id, eventId))
    .returning();

  res.json({ event: toClientEvent(event) });
});

router.delete("/events/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const eventId = String(req.params.id);
  const [existing] = await db
    .select({ organizerId: eventsTable.organizerId })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (!existing) { res.status(404).json({ message: "Event not found" }); return; }
  if (existing.organizerId !== userId) { res.status(403).json({ message: "Not authorized" }); return; }

  await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  res.json({ message: "Event deleted" });
});

export default router;
