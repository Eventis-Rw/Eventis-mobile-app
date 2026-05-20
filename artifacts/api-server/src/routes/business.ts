import { bookingsTable, db, eventsTable, reviewsTable, usersTable } from "@workspace/db";
import { count, eq, sum } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/business/stats", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;

  const [user] = await db
    .select({ isBusinessAccount: usersTable.isBusinessAccount })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user?.isBusinessAccount) {
    res.status(403).json({ message: "Business account required" });
    return;
  }

  const myEvents = await db
    .select({ id: eventsTable.id, attendees: eventsTable.attendees, reviewCount: eventsTable.reviewCount })
    .from(eventsTable)
    .where(eq(eventsTable.organizerId, userId));

  const eventIds = myEvents.map((e) => e.id);

  let totalBookings = 0;
  let revenue = 0;

  if (eventIds.length > 0) {
    for (const eventId of eventIds) {
      const [b] = await db
        .select({ c: count(bookingsTable.id), rev: sum(bookingsTable.totalPrice) })
        .from(bookingsTable)
        .where(eq(bookingsTable.eventId, eventId));
      totalBookings += Number(b?.c ?? 0);
      revenue += Number(b?.rev ?? 0);
    }
  }

  const totalAttendees = myEvents.reduce((acc, e) => acc + e.attendees, 0);
  const totalReviews = myEvents.reduce((acc, e) => acc + e.reviewCount, 0);

  res.json({
    stats: {
      totalEvents: myEvents.length,
      totalBookings,
      totalAttendees,
      totalReviews,
      revenue,
      revenueFormatted: `£${(revenue / 100).toLocaleString("en-GB")}`,
      views: totalAttendees * 5,
      clickThrough: Math.round(totalAttendees * 0.35),
    },
  });
});

router.get("/business/events", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;

  const [user] = await db
    .select({ isBusinessAccount: usersTable.isBusinessAccount })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user?.isBusinessAccount) {
    res.status(403).json({ message: "Business account required" });
    return;
  }

  const events = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.organizerId, userId));

  res.json({
    events: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
  });
});

export default router;
