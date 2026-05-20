import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  isPhoneVerified: boolean("is_phone_verified").notNull().default(false),
  isBusinessAccount: boolean("is_business_account").notNull().default(false),
  bio: text("bio"),
  businessName: text("business_name"),
  businessType: text("business_type"),
  businessWebsite: text("business_website"),
  joinedDate: timestamp("joined_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const savedEventsTable = pgTable("saved_events", {
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  eventId: text("event_id").notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  joinedDate: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
