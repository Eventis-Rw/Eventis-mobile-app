/** Local Live simulator. None of these client-side checks authorize a real broadcast or payment. */
export const LIVE_LIMITS = { rooms: 5, guests: 4, durationMs: 30 * 60_000, dailySessions: 1, dailyGiftCoins: 1000 } as const;
export const LIVE_GIFTS = [
  { id: "spark", name: "Spark", emoji: "✨", coins: 10 },
  { id: "applause", name: "Applause", emoji: "👏", coins: 50 },
  { id: "spotlight", name: "Spotlight", emoji: "🌟", coins: 100 },
  { id: "encore", name: "Encore", emoji: "🎉", coins: 500 },
] as const;
export type LivePerson = { id: string; name: string; avatar?: string };
export type LiveMode = "video" | "voice";
export type LiveMessage = { id: string; person: LivePerson; text: string; at: number; kind: "chat" | "gift" | "system" };
export type LiveRoom = {
  id: string; host: LivePerson; title: string; mode: LiveMode; eventId?: string; cover?: string;
  startedAt: number; endsAt: number; endedAt?: number; guests: LivePerson[]; requests: LivePerson[];
  invitations: LivePerson[]; audience: LivePerson[]; mutedIds: string[]; blockedIds: string[];
  messages: LiveMessage[]; chatEnabled: boolean; giftsEnabled: boolean; reactions: number;
};
export type LiveDraft = { title: string; mode: LiveMode; eventId?: string; cover?: string; chatEnabled: boolean; giftsEnabled: boolean };
export type LiveTransaction = { id: string; roomId: string; senderId: string; hostId: string; guestIds: string[]; giftId: string; coins: number; at: number };
export type LiveState = {
  version: 1; rooms: LiveRoom[]; queue: { person: LivePerson; draft: LiveDraft; at: number }[];
  wallets: Record<string, number>; transactions: LiveTransaction[]; starts: { userId: string; at: number }[];
};
export type LiveFacts = { views: number; publishedEvents: number; joinedAt: number; verifiedOrganizer: boolean; suspended: boolean; safetyApproved: boolean };
export function liveEligibility(facts: LiveFacts, now = Date.now()) {
  const checks = [
    { label: "500 genuine event views", met: facts.views >= 500, value: `${facts.views} / 500` },
    { label: "Account at least 7 days old", met: Number.isFinite(facts.joinedAt) && now - facts.joinedAt >= 7 * 86400000 },
    { label: "One published event", met: facts.publishedEvents > 0 },
    { label: "Account safety approved", met: facts.safetyApproved && !facts.suspended },
  ];
  return { checks, eligible: !facts.suspended && facts.safetyApproved && (facts.verifiedOrganizer || checks.every(c => c.met)) };
}
const day = (at: number) => new Date(at).toISOString().slice(0, 10);
const id = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
const ensure = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
export function createLiveState(now = Date.now()): LiveState {
  const hosts = [
    { name: "Kigali Jazz", title: "Backstage before the first song", mode: "video" as const, avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900" },
    { name: "Tech Kigali", title: "Ideas after hours · open mic", mode: "voice" as const, avatar: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=160", cover: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900" },
    { name: "Midnight Beats", title: "The warm-up room", mode: "video" as const, avatar: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=160", cover: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900" },
  ];
  return { version: 1, queue: [], wallets: {}, transactions: [], starts: [], rooms: hosts.map((h, i) => ({
    ...h, id: `sample_${i}`, host: { id: `sample_host_${i}`, name: h.name, avatar: h.avatar },
    startedAt: now, endsAt: now + LIVE_LIMITS.durationMs, guests: [], requests: [], invitations: [], audience: [],
    mutedIds: [], blockedIds: [], messages: [], chatEnabled: true, giftsEnabled: true, reactions: 0,
  })) };
}
export function activeRooms(state: LiveState, now = Date.now()) { return state.rooms.filter(r => !r.endedAt && r.endsAt > now); }
/** Validate persisted demo data before it reaches the UI. A bad cache is recoverable via Reset demo. */
export function readLiveState(raw: string | null, now = Date.now()): LiveState {
  if (!raw) return createLiveState(now);
  const data = JSON.parse(raw);
  const person = (p: any) => p && typeof p.id === "string" && typeof p.name === "string" && (!p.avatar || typeof p.avatar === "string");
  const people = (ps: any) => Array.isArray(ps) && ps.every(person);
  const strings = (xs: any) => Array.isArray(xs) && xs.every((x: any) => typeof x === "string");
  const draft = (d: any) => d && typeof d.title === "string" && ["voice", "video"].includes(d.mode) && typeof d.chatEnabled === "boolean" && typeof d.giftsEnabled === "boolean";
  const valid = data?.version === 1 && Array.isArray(data.rooms) && data.rooms.every((r: any) =>
    draft(r) && typeof r.id === "string" && person(r.host) && Number.isFinite(r.startedAt) && Number.isFinite(r.endsAt) &&
    (!r.endedAt || Number.isFinite(r.endedAt)) && Number.isFinite(r.reactions) &&
    people(r.guests) && people(r.requests) && people(r.invitations) && people(r.audience) && strings(r.mutedIds) && strings(r.blockedIds) &&
    Array.isArray(r.messages) && r.messages.every((m: any) => m && typeof m.id === "string" && person(m.person) && typeof m.text === "string" && Number.isFinite(m.at) && ["chat", "gift", "system"].includes(m.kind))) &&
    Array.isArray(data.queue) && data.queue.every((q: any) => q && person(q.person) && draft(q.draft) && Number.isFinite(q.at)) &&
    Array.isArray(data.starts) && data.starts.every((s: any) => s && typeof s.userId === "string" && Number.isFinite(s.at)) &&
    data.wallets && typeof data.wallets === "object" && !Array.isArray(data.wallets) && Object.values(data.wallets).every(n => Number.isSafeInteger(n) && Number(n) >= 0) &&
    Array.isArray(data.transactions) && data.transactions.every((t: any) => t && [t.id, t.roomId, t.senderId, t.hostId, t.giftId].every(v => typeof v === "string") && strings(t.guestIds) && Number.isSafeInteger(t.coins) && t.coins > 0 && Number.isFinite(t.at));
  ensure(valid, "Your Live demo data could not be read. Reset the demo to start again.");
  return tickLiveState(data as LiveState, now);
}
export function tickLiveState(state: LiveState, now = Date.now()): LiveState {
  if (!state.rooms.some(r => !r.endedAt && r.endsAt <= now)) return state;
  return { ...state, rooms: state.rooms.map(r => !r.endedAt && r.endsAt <= now ? { ...r, endedAt: r.endsAt, requests: [], invitations: [], audience: [] } : r) };
}
export type LiveAction =
  | { type: "start"; draft: LiveDraft }
  | { type: "cancelQueue" }
  | { type: "join" | "leave" | "end" | "request" | "cancelRequest" | "acceptInvite" | "declineInvite" | "leaveSeat" | "react"; roomId: string }
  | { type: "message"; roomId: string; text: string }
  | { type: "accept" | "reject" | "invite" | "remove" | "mute" | "unmute" | "block"; roomId: string; person: LivePerson }
  | { type: "settings"; roomId: string; chatEnabled: boolean; giftsEnabled: boolean }
  | { type: "gift"; roomId: string; giftId: string; transactionId: string };

/** Pure state transitions keep authorization, limits and accounting together. */
export function reduceLive(previous: LiveState, actor: LivePerson, action: LiveAction, now = Date.now()): LiveState {
  const state: LiveState = JSON.parse(JSON.stringify(tickLiveState(previous, now)));
  ensure(actor.id && actor.name, "Sign in to use Live.");
  if (action.type === "cancelQueue") { state.queue = state.queue.filter(q => q.person.id !== actor.id); return state; }
  if (action.type === "start") {
    ensure(action.draft.title.trim().length > 0 && action.draft.title.trim().length <= 80, "Add a title of up to 80 characters.");
    ensure(!activeRooms(state, now).some(r => r.host.id === actor.id), "You already have an active room.");
    ensure(state.starts.filter(s => s.userId === actor.id && day(s.at) === day(now)).length < LIVE_LIMITS.dailySessions, "You have used today's demo session. Come back tomorrow (UTC).");
    if (state.queue.length && state.queue[0].person.id !== actor.id || activeRooms(state, now).length >= LIVE_LIMITS.rooms) {
      if (!state.queue.some(q => q.person.id === actor.id)) state.queue.push({ person: actor, draft: action.draft, at: now });
      return state;
    }
    state.queue = state.queue.filter(q => q.person.id !== actor.id);
    state.starts.push({ userId: actor.id, at: now });
    state.rooms.unshift({ ...action.draft, title: action.draft.title.trim(), id: `room_${id()}`, host: actor,
      startedAt: now, endsAt: now + LIVE_LIMITS.durationMs, guests: [], requests: [], invitations: [], audience: [],
      mutedIds: [], blockedIds: [], messages: [], reactions: 0 });
    return state;
  }
  const room = state.rooms.find(r => r.id === action.roomId);
  ensure(room, "This room is no longer available.");
  if (!room) return state;
  const host = room.host.id === actor.id;
  if (action.type === "leave") {
    ensure(!host, "End your Live before leaving.");
    room.audience = room.audience.filter(p => p.id !== actor.id);
    room.requests = room.requests.filter(p => p.id !== actor.id);
    room.invitations = room.invitations.filter(p => p.id !== actor.id);
    room.guests = room.guests.filter(p => p.id !== actor.id);
    return state;
  }
  ensure(!room.endedAt && room.endsAt > now, "This Live has ended.");
  ensure(!room.blockedIds.includes(actor.id), "The host has blocked you from this room.");
  const hostActions = ["end", "accept", "reject", "invite", "remove", "mute", "unmute", "block", "settings"];
  if (hostActions.includes(action.type)) ensure(host, "Only the host can do that.");
  if (action.type !== "join" && !host) ensure(room.audience.some(p => p.id === actor.id), "Join the room first.");
  switch (action.type) {
    case "join": if (!host && !room.audience.some(p => p.id === actor.id)) room.audience.push(actor); break;
    case "end": room.endedAt = now; room.requests = []; room.invitations = []; room.audience = []; break;
    case "message":
      ensure(host || room.chatEnabled, "Chat is paused by the host.");
      ensure(!room.mutedIds.includes(actor.id), "The host has muted your chat.");
      ensure(action.text.trim().length > 0 && action.text.trim().length <= 240, "Use between 1 and 240 characters.");
      ensure(!room.messages.some(m => m.person.id === actor.id && m.kind === "chat" && now - m.at < 1000), "Please wait a moment before sending again.");
      room.messages.push({ id: id(), person: actor, text: action.text.trim(), at: now, kind: "chat" }); break;
    case "request":
      ensure(!host && !room.guests.some(p => p.id === actor.id), "You are already on stage.");
      ensure(room.guests.length < LIVE_LIMITS.guests, "All four guest seats are occupied.");
      if (!room.requests.some(p => p.id === actor.id)) room.requests.push(actor); break;
    case "cancelRequest": room.requests = room.requests.filter(p => p.id !== actor.id); break;
    case "invite":
      ensure(action.person.id !== actor.id && room.audience.some(p => p.id === action.person.id), "Invite someone currently in the room.");
      ensure(!room.guests.some(p => p.id === action.person.id) && !room.blockedIds.includes(action.person.id), "This viewer cannot be invited.");
      ensure(room.guests.length < LIVE_LIMITS.guests, "All four guest seats are occupied.");
      if (!room.invitations.some(p => p.id === action.person.id)) room.invitations.push(action.person); break;
    case "accept": case "acceptInvite": {
      const person = action.type === "accept" ? action.person : actor;
      ensure((action.type === "accept" ? room.requests : room.invitations).some(p => p.id === person.id), "This request is no longer available.");
      ensure(room.audience.some(p => p.id === person.id) && !room.blockedIds.includes(person.id), "This viewer has left the room.");
      ensure(room.guests.length < LIVE_LIMITS.guests, "All four guest seats are occupied.");
      if (!room.guests.some(p => p.id === person.id)) room.guests.push(person);
      room.requests = room.requests.filter(p => p.id !== person.id); room.invitations = room.invitations.filter(p => p.id !== person.id); break;
    }
    case "declineInvite": room.invitations = room.invitations.filter(p => p.id !== actor.id); break;
    case "reject": room.requests = room.requests.filter(p => p.id !== action.person.id); break;
    case "remove": room.guests = room.guests.filter(p => p.id !== action.person.id); break;
    case "leaveSeat": room.guests = room.guests.filter(p => p.id !== actor.id); break;
    case "mute": if (!room.mutedIds.includes(action.person.id)) room.mutedIds.push(action.person.id); break;
    case "unmute": room.mutedIds = room.mutedIds.filter(p => p !== action.person.id); break;
    case "block":
      ensure(action.person.id !== actor.id, "You cannot block yourself.");
      if (!room.blockedIds.includes(action.person.id)) room.blockedIds.push(action.person.id);
      room.audience = room.audience.filter(p => p.id !== action.person.id); room.guests = room.guests.filter(p => p.id !== action.person.id);
      room.requests = room.requests.filter(p => p.id !== action.person.id); room.invitations = room.invitations.filter(p => p.id !== action.person.id); break;
    case "settings": room.chatEnabled = action.chatEnabled; room.giftsEnabled = action.giftsEnabled; break;
    case "react": room.reactions++; break;
    case "gift": {
      ensure(action.transactionId.trim(), "A transaction ID is required.");
      if (state.transactions.some(t => t.id === action.transactionId)) return state;
      ensure(!host && !room.guests.some(p => p.id === actor.id), "Hosts and guests cannot gift their own room.");
      ensure(room.giftsEnabled, "Gifts are paused by the host.");
      const gift = LIVE_GIFTS.find(g => g.id === action.giftId);
      ensure(gift, "This gift is unavailable."); if (!gift) return state;
      const spent = state.transactions.filter(t => t.senderId === actor.id && day(t.at) === day(now)).reduce((n, t) => n + t.coins, 0);
      ensure(spent + gift.coins <= LIVE_LIMITS.dailyGiftCoins, "You have reached the daily demo gift limit.");
      const balance = state.wallets[actor.id] ?? 500;
      ensure(balance >= gift.coins, "Not enough demo coins. Real top-ups are not available yet.");
      state.wallets[actor.id] = balance - gift.coins;
      state.transactions.push({ id: action.transactionId, roomId: room.id, senderId: actor.id, hostId: room.host.id, guestIds: room.guests.map(p => p.id), giftId: gift.id, coins: gift.coins, at: now });
      room.messages.push({ id: action.transactionId, person: actor, text: `${gift.emoji} sent ${gift.name} · ${gift.coins} coins`, at: now, kind: "gift" }); break;
    }
  }
  room.messages = room.messages.slice(-150);
  return state;
}
