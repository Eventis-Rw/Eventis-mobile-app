import { db, eventsTable, reviewsTable, usersTable } from "@workspace/db";
import { and, avg, count, desc, eq } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/events/:id/reviews", async (req: Request, res: Response) => {
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.eventId, String(req.params.id)))
    .orderBy(desc(reviewsTable.createdAt));

  res.json({
    reviews: reviews.map((r) => ({
      ...r,
      id: r.id.toString(),
      userId: r.userId.toString(),
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

router.post("/events/:id/reviews", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const eventId = String(req.params.id);

  const schema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(10).max(500),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid review data" }); return; }

  const existing = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.eventId, eventId), eq(reviewsTable.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ message: "You have already reviewed this event" });
    return;
  }

  const [user] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const [review] = await db
    .insert(reviewsTable)
    .values({ eventId, userId, username: user?.username ?? "User", ...parsed.data })
    .returning();

  const [stats] = await db
    .select({ avg: avg(reviewsTable.rating), count: count(reviewsTable.id) })
    .from(reviewsTable)
    .where(eq(reviewsTable.eventId, eventId));

  if (stats?.avg) {
    await db
      .update(eventsTable)
      .set({
        rating: parseFloat(parseFloat(stats.avg).toFixed(1)),
        reviewCount: Number(stats.count),
      })
      .where(eq(eventsTable.id, eventId));
  }

  res.status(201).json({
    review: {
      ...review,
      id: review.id.toString(),
      userId: review.userId.toString(),
      createdAt: review.createdAt.toISOString(),
    },
  });
});

export default router;
