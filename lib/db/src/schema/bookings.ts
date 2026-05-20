import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { usersTable } from "./users";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => eventsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  eventTitle: text("event_title").notNull(),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  eventLocation: text("event_location").notNull(),
  eventImage: text("event_image").notNull(),
  status: text("status", { enum: ["confirmed", "pending", "cancelled"] })
    .notNull()
    .default("confirmed"),
  ticketCode: text("ticket_code").notNull(),
  quantity: integer("quantity").notNull().default(1),
  totalPrice: integer("total_price").notNull().default(0),
  currency: text("currency").notNull().default("GBP"),
  isPaid: boolean("is_paid").notNull().default(false),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  purchasedAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
