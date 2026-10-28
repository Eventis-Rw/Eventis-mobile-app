import type {
  LiveListing,
  LiveReservation,
  LiveWatchSession,
} from "./liveDirectoryService";
import {
  readLiveState,
  type LiveAction,
  type LivePerson,
  type LiveRoom,
  type LiveState,
} from "./liveState";

export const LIVE_DATA_TOPIC = "eventis.live.v1";
export const liveProject = {
  tokenServerId: process.env.EXPO_PUBLIC_LIVEKIT_TOKEN_SERVER_ID?.trim() ?? "",
  serverUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL?.trim() ?? "",
};
export type BroadcastSession = {
  code: string;
  identity: string;
  hostId: string;
  title: string;
  mode: "video" | "voice";
  hosting: boolean;
  facingMode?: "user" | "environment";
  listing?: LiveListing;
  controlToken?: string;
  profile?: LivePerson;
};
export function createBroadcastSession(
  title: string,
  mode: "video" | "voice",
  nonce: string,
): BroadcastSession {
  if (!title.trim() || title.trim().length > 80)
    throw new Error("Add a title of up to 80 characters.");
  if (!/^[a-z0-9]{12,40}$/.test(nonce))
    throw new Error("Could not create a room code.");
  const code = `ev1-${mode === "video" ? "v" : "a"}-${nonce}`;
  return {
    code,
    identity: `host-${nonce}`,
    hostId: `host-${nonce}`,
    title: title.trim(),
    mode,
    hosting: true,
  };
}
export function joinBroadcastSession(
  code: string,
  nonce: string,
): BroadcastSession {
  const clean = code.trim().toLowerCase();
  const match = /^ev1-([va])-([a-z0-9]{12,40})$/.exec(clean);
  if (!match)
    throw new Error("Enter the full Eventis room code shared by the host.");
  return {
    code: clean,
    identity: `viewer-${nonce}`,
    hostId: `host-${match[2]}`,
    title: "Joining Live…",
    mode: match[1] === "v" ? "video" : "voice",
    hosting: false,
  };
}
export function reservationSession(
  reservation: LiveReservation,
  profile: LivePerson,
  facingMode: "user" | "environment",
): BroadcastSession {
  return {
    code: reservation.roomName,
    identity: reservation.hostIdentity,
    hostId: reservation.hostIdentity,
    title: reservation.listing.title,
    mode: reservation.listing.mode,
    hosting: true,
    listing: reservation.listing,
    controlToken: reservation.controlToken,
    profile,
    facingMode,
  };
}
export function watchSession(
  watch: LiveWatchSession,
  profile: LivePerson,
  nonce: string,
): BroadcastSession {
  return {
    code: watch.roomName,
    identity: `viewer-${nonce}`,
    hostId: watch.hostIdentity,
    title: watch.listing.title,
    mode: watch.listing.mode,
    hosting: false,
    listing: watch.listing,
    profile,
  };
}
export function roomState(room: LiveRoom): LiveState {
  return {
    version: 1,
    rooms: [room],
    wallets: {},
    transactions: [],
    starts: [],
    queue: [],
  };
}
export function initialBroadcastRoom(
  session: BroadcastSession,
  person: LivePerson,
  now = Date.now(),
): LiveRoom {
  return {
    id: session.code,
    title: session.title,
    mode: session.mode,
    host: { ...(session.listing?.host ?? person), id: session.hostId },
    ...(session.listing?.event
      ? {
          eventId: session.listing.event.id,
          cover: session.listing.event.image,
        }
      : {}),
    startedAt: session.listing?.startedAt ?? now,
    endsAt: session.listing?.endsAt ?? now + 30 * 60_000,
    guests: [],
    requests: [],
    invitations: [],
    audience: [],
    mutedIds: [],
    blockedIds: [],
    messages: [],
    chatEnabled: session.listing?.chatEnabled ?? true,
    giftsEnabled: false,
    reactions: 0,
  };
}
// SDK sender identity, never identity supplied in JSON, determines the actor.
export function parseGuestAction(
  value: unknown,
  roomId: string,
): LiveAction | null {
  if (!value || typeof value !== "object") return null;
  const a = value as Record<string, unknown>;
  if (a.roomId !== roomId) return null;
  if (a.type === "message")
    return typeof a.text === "string" && a.text.length <= 240
      ? { type: "message", roomId, text: a.text }
      : null;
  if (
    [
      "request",
      "cancelRequest",
      "acceptInvite",
      "declineInvite",
      "leaveSeat",
      "react",
      "leave",
    ].includes(String(a.type))
  )
    return { type: a.type, roomId } as LiveAction;
  return null;
}
export function serializeBroadcastRoom(room: LiveRoom): LiveRoom {
  const compact = (p: LivePerson): LivePerson => ({
    id: p.id,
    name: p.name.slice(0, 64),
    ...(p.avatar && /^https?:\/\//.test(p.avatar) && p.avatar.length <= 300
      ? { avatar: p.avatar }
      : {}),
  });
  return {
    ...room,
    host: compact(room.host),
    audience: [],
    guests: room.guests.map(compact),
    requests: room.requests.slice(0, 20).map(compact),
    invitations: room.invitations.slice(0, 20).map(compact),
    messages: room.messages
      .slice(-15)
      .map((m) => ({ ...m, person: compact(m.person) })),
  };
}
export function parseHostSnapshot(
  value: unknown,
  senderId: string,
  session: BroadcastSession,
): LiveRoom | null {
  if (senderId !== session.hostId) return null;
  try {
    const parsed = readLiveState(JSON.stringify(roomState(value as LiveRoom)))
      .rooms[0];
    if (
      parsed.id !== session.code ||
      parsed.host.id !== session.hostId ||
      parsed.guests.length > 4 ||
      parsed.giftsEnabled
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}
