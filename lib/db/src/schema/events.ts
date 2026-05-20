import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  city: text("city").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  endTime: text("end_time").notNull(),
  price: integer("price").notNull().default(0),
  currency: text("currency").notNull().default("GBP"),
  organizer: text("organizer").notNull(),
  organizerId: integer("organizer_id"),
  organizerWebsite: text("organizer_website"),
  attendees: integer("attendees").notNull().default(0),
  capacity: integer("capacity").notNull(),
  image: text("image").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  isFeatured: boolean("is_featured").notNull().default(false),
  isSponsored: boolean("is_sponsored").notNull().default(false),
  isPaid: boolean("is_paid").notNull().default(false),
  distance: real("distance").notNull().default(0),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  createdAt: true,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
