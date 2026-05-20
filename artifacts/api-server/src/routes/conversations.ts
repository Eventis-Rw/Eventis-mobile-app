import {
  conversationParticipantsTable,
  conversationsTable,
  db,
  messagesTable,
} from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/conversations", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;

  const participations = await db
    .select({ conversationId: conversationParticipantsTable.conversationId })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.userId, userId));

  if (participations.length === 0) {
    res.json({ conversations: [] });
    return;
  }

  const ids = participations.map((p) => p.conversationId);
  const convos = await Promise.all(
    ids.map(async (id) => {
      const [convo] = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, id))
        .limit(1);
      if (!convo) return null;

      const [part] = await db
        .select({ unreadCount: conversationParticipantsTable.unreadCount })
        .from(conversationParticipantsTable)
        .where(
          and(
            eq(conversationParticipantsTable.conversationId, id),
            eq(conversationParticipantsTable.userId, userId)
          )
        )
        .limit(1);

      const [msgCount] = await db
        .select()
        .from(conversationParticipantsTable)
        .where(eq(conversationParticipantsTable.conversationId, id));

      return {
        id: convo.id.toString(),
        eventId: convo.eventId,
        eventTitle: convo.eventTitle,
        eventOrganizer: convo.eventOrganizer,
        lastMessage: convo.lastMessage ?? "",
        lastMessageTime: convo.lastMessageAt
          ? new Date(convo.lastMessageAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          : "",
        unreadCount: part?.unreadCount ?? 0,
        participants: ids.length,
      };
    })
  );

  res.json({ conversations: convos.filter(Boolean) });
});

router.post("/conversations", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({
    eventId: z.string(),
    eventTitle: z.string(),
    eventOrganizer: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid input" }); return; }

  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.eventId, parsed.data.eventId))
    .limit(1);

  let convo = existing;
  if (!convo) {
    const [created] = await db
      .insert(conversationsTable)
      .values(parsed.data)
      .returning();
    convo = created;
  }

  const alreadyIn = await db
    .select({ id: conversationParticipantsTable.id })
    .from(conversationParticipantsTable)
    .where(
      and(
        eq(conversationParticipantsTable.conversationId, convo.id),
        eq(conversationParticipantsTable.userId, userId)
      )
    )
    .limit(1);

  if (alreadyIn.length === 0) {
    await db
      .insert(conversationParticipantsTable)
      .values({ conversationId: convo.id, userId })
      .onConflictDoNothing();
  }

  res.json({ conversationId: convo.id.toString() });
});

router.get("/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const convoId = parseInt(String(req.params.id), 10);
  if (isNaN(convoId)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const participant = await db
    .select({ id: conversationParticipantsTable.id })
    .from(conversationParticipantsTable)
    .where(
      and(
        eq(conversationParticipantsTable.conversationId, convoId),
        eq(conversationParticipantsTable.userId, userId)
      )
    )
    .limit(1);

  if (participant.length === 0) {
    res.status(403).json({ message: "Not a participant" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convoId))
    .orderBy(asc(messagesTable.timestamp));

  res.json({
    messages: messages.map((m) => ({
      ...m,
      id: m.id.toString(),
      senderId: m.senderId.toString(),
      conversationId: m.conversationId.toString(),
      timestamp: m.timestamp.toISOString(),
      isOwn: m.senderId === userId,
    })),
  });
});

router.post("/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const convoId = parseInt(String(req.params.id), 10);
  if (isNaN(convoId)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const schema = z.object({ content: z.string().min(1).max(2000), senderName: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid message" }); return; }

  const [msg] = await db
    .insert(messagesTable)
    .values({ conversationId: convoId, senderId: userId, ...parsed.data })
    .returning();

  await db
    .update(conversationsTable)
    .set({ lastMessage: parsed.data.content, lastMessageAt: new Date() })
    .where(eq(conversationsTable.id, convoId));

  res.status(201).json({
    message: {
      ...msg,
      id: msg.id.toString(),
      senderId: msg.senderId.toString(),
      conversationId: msg.conversationId.toString(),
      timestamp: msg.timestamp.toISOString(),
      isOwn: true,
    },
  });
});

export default router;
