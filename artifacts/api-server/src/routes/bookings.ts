import { bookingsTable, db, eventsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

function toClientBooking(b: typeof bookingsTable.$inferSelect) {
  return {
    ...b,
    id: b.id.toString(),
    userId: b.userId.toString(),
    purchasedAt: b.purchasedAt.toISOString(),
  };
}

router.get("/bookings", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.userId, userId))
    .orderBy(bookingsTable.purchasedAt);
  res.json({ bookings: bookings.map(toClientBooking).reverse() });
});

router.post("/bookings", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({
    eventId: z.string(),
    eventTitle: z.string(),
    eventDate: z.string(),
    eventTime: z.string(),
    eventLocation: z.string(),
    eventImage: z.string(),
    quantity: z.number().int().min(1).default(1),
    totalPrice: z.number().int().min(0).default(0),
    currency: z.string().default("GBP"),
    isPaid: z.boolean().default(false),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid booking data" }); return; }

  const existing = await db
    .select({ id: bookingsTable.id })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.userId, userId),
        eq(bookingsTable.eventId, parsed.data.eventId),
        eq(bookingsTable.status, "confirmed")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ message: "Already booked this event" });
    return;
  }

  const ticketCode = `EVT${parsed.data.eventId.padStart(4, "0")}-${Date.now().toString(36).toUpperCase()}`;
  const [booking] = await db
    .insert(bookingsTable)
    .values({ ...parsed.data, userId, status: "confirmed", ticketCode })
    .returning();

  res.status(201).json({ booking: toClientBooking(booking) });
});

router.get("/bookings/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const bookingId = parseInt(String(req.params.id), 10);
  if (isNaN(bookingId)) { res.status(400).json({ message: "Invalid booking ID" }); return; }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, bookingId), eq(bookingsTable.userId, userId)))
    .limit(1);

  if (!booking) { res.status(404).json({ message: "Booking not found" }); return; }
  res.json({ booking: toClientBooking(booking) });
});

router.delete("/bookings/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const bookingId = parseInt(String(req.params.id), 10);
  if (isNaN(bookingId)) { res.status(400).json({ message: "Invalid booking ID" }); return; }

  const [booking] = await db
    .update(bookingsTable)
    .set({ status: "cancelled" })
    .where(and(eq(bookingsTable.id, bookingId), eq(bookingsTable.userId, userId)))
    .returning();

  if (!booking) { res.status(404).json({ message: "Booking not found" }); return; }
  res.json({ booking: toClientBooking(booking) });
});

export default router;
