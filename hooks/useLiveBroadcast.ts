import { useEffect, useMemo, useRef, useState } from "react";
import {
  liveDirectoryApi,
  publicLiveImage,
} from "@/services/liveDirectoryService";
import { ApiError } from "@/utils/apiClient";
import { AppState, Platform } from "react-native";
import {
  ConnectionState,
  Room,
  RoomEvent,
  TokenSource,
  Track,
  type Participant,
  type RemoteParticipant,
} from "livekit-client";
import {
  attachRoomAudio,
  prepareLiveMedia,
  stopLiveMedia,
} from "@/services/liveMedia";
import {
  initialBroadcastRoom,
  LIVE_DATA_TOPIC,
  liveProject,
  parseGuestAction,
  parseHostSnapshot,
  roomState,
  serializeBroadcastRoom,
  type BroadcastSession,
} from "@/services/liveBroadcastProtocol";
import {
  reduceLive,
  type LiveAction,
  type LivePerson,
  type LiveRoom,
  type LiveState,
} from "@/services/liveState";

function personOf(p: Participant): LivePerson {
  let avatar: string | undefined;
  try {
    const metadata = JSON.parse(p.metadata || "{}");
    const image =
      typeof metadata.avatar === "string"
        ? publicLiveImage(metadata.avatar)
        : undefined;
    if (image?.startsWith("http") && image.length <= 300) avatar = image;
  } catch {}
  return {
    id: p.identity,
    name: (p.name || "Guest").slice(0, 64),
    ...(avatar ? { avatar } : {}),
  };
}
async function releaseLocalCapture(
  room: Room,
  sources = [Track.Source.Camera, Track.Source.Microphone],
) {
  await Promise.allSettled(
    sources.map(async (source) => {
      const track = room.localParticipant.getTrackPublication(source)?.track;
      if (!track) return;
      try {
        await room.localParticipant.unpublishTrack(track, true);
      } finally {
        track.stop();
      }
    }),
  );
}
function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The connection failed. Please try again.";
}
function deadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "LiveKit did not respond. Check your connection and project settings.",
          ),
        ),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
type Wire = {
  type: string;
  id?: string;
  action?: unknown;
  room?: unknown;
  error?: string;
};

/** Host coordinates the testing room over LiveKit data. Production must move this authority to the server. */
export function useLiveBroadcast(session: BroadcastSession, name: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [model, setModel] = useState<LiveRoom>(() =>
    initialBroadcastRoom(session, { id: session.identity, name }),
  );
  const [connection, setConnection] = useState("connecting");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [attempt, setAttempt] = useState(0);
  const [stageConsent, setStageConsent] = useState(false);
  const modelRef = useRef(model);
  const channel = useRef<{
    act: (a: LiveAction) => Promise<LiveState>;
    disconnect: () => Promise<void>;
  } | null>(null);
  const mediaLock = useRef(Promise.resolve());
  const facing = useRef<"user" | "environment">(session.facingMode ?? "user");
  const isHost = session.hosting;

  useEffect(() => {
    let disposed = false;
    let rtc: Room | null = null;
    let removeAudio = () => {};
    let connectedAt = 0;
    let hostMissingAt = 0;
    let receivedSnapshot = false;
    let mediaPrepared = false;
    let mediaReleased = false;
    let backgrounded = false;
    const acknowledgements = new Map<
      string,
      {
        resolve: (s: LiveState) => void;
        reject: (e: Error) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    >();
    const processed = new Map<string, string | undefined>();
    const initial = initialBroadcastRoom(session, {
      id: session.identity,
      name,
    });
    modelRef.current = initial;
    setModel(initial);
    setReady(false);
    setConnection("connecting");
    setError("");
    setStageConsent(false);
    const roster = () =>
      rtc
        ? [rtc.localParticipant, ...rtc.remoteParticipants.values()]
            .filter((p) => p.identity !== session.hostId && p.identity)
            .map(personOf)
        : [];
    const update = (next: LiveRoom) => {
      const audience = roster();
      modelRef.current = { ...next, audience };
      if (!disposed) {
        setModel(modelRef.current);
        setRevision((r) => r + 1);
      }
    };
    const send = async (value: Wire, target?: string) => {
      if (!rtc || rtc.state !== ConnectionState.Connected)
        throw new Error("Reconnecting. Try again when the room is connected.");
      const bytes = new TextEncoder().encode(JSON.stringify(value));
      if (bytes.length > 15000)
        throw new Error("The room update is too large to send.");
      await rtc.localParticipant.publishData(bytes, {
        reliable: true,
        topic: LIVE_DATA_TOPIC,
        destinationIdentities: target ? [target] : undefined,
      });
    };
    const snapshot = () => serializeBroadcastRoom(modelRef.current);
    const broadcast = () => send({ type: "state", room: snapshot() });
    const apply = (actor: LivePerson, action: LiveAction) => {
      if (action.type === "gift")
        throw new Error(
          "Gifts remain in the local demo until a shared wallet is connected.",
        );
      if (action.type === "settings")
        action = { ...action, giftsEnabled: false };
      if (action.type === "request" && modelRef.current.requests.length >= 20)
        throw new Error("The request list is full. Try again shortly.");
      update(modelRef.current);
      const next = reduceLive(roomState(modelRef.current), actor, action)
        .rooms[0];
      update(next);
      return roomState(modelRef.current);
    };
    const fail = (e: unknown) => {
      if (!disposed) setError(messageOf(e));
    };
    const onData = (
      payload: Uint8Array,
      sender?: RemoteParticipant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (
        disposed ||
        topic !== LIVE_DATA_TOPIC ||
        !sender ||
        payload.byteLength > 15000
      )
        return;
      let data: Wire;
      try {
        data = JSON.parse(new TextDecoder().decode(payload));
      } catch {
        return;
      }
      if (!data || typeof data !== "object") return;
      if (isHost) {
        if (data.type === "hello") {
          void send({ type: "state", room: snapshot() }, sender.identity).catch(
            fail,
          );
          return;
        }
        if (
          data.type !== "action" ||
          typeof data.id !== "string" ||
          data.id.length > 100
        )
          return;
        const action = parseGuestAction(data.action, session.code);
        if (!action) return;
        const key = `${sender.identity}:${data.id}`;
        let actionError = processed.get(key);
        if (!processed.has(key)) {
          try {
            apply(personOf(sender), action);
          } catch (e) {
            actionError = messageOf(e);
          }
          processed.set(key, actionError);
          if (processed.size > 500)
            processed.delete(processed.keys().next().value!);
        }
        void send(
          { type: "ack", id: data.id, error: actionError, room: snapshot() },
          sender.identity,
        ).catch(fail);
        void broadcast().catch(fail);
      } else if (sender.identity === session.hostId) {
        const next = parseHostSnapshot(data.room, sender.identity, session);
        if (next) {
          receivedSnapshot = true;
          update(next);
          setReady(true);
        }
        if (data.type === "ack" && data.id) {
          const waiting = acknowledgements.get(data.id);
          if (waiting) {
            clearTimeout(waiting.timer);
            acknowledgements.delete(data.id);
            data.error
              ? waiting.reject(new Error(data.error))
              : next
                ? waiting.resolve(roomState(modelRef.current))
                : waiting.reject(new Error("Invalid host response."));
          }
        }
      }
    };
    const changed = () => {
      if (disposed || !rtc) return;
      if (isHost) {
        const present = new Set(roster().map((p) => p.id));
        update({
          ...modelRef.current,
          guests: modelRef.current.guests.filter((p) => present.has(p.id)),
          requests: modelRef.current.requests.filter((p) => present.has(p.id)),
          invitations: modelRef.current.invitations.filter((p) =>
            present.has(p.id),
          ),
        });
        void broadcast().catch(fail);
      } else update(modelRef.current);
      setRevision((r) => r + 1);
    };
    const connectionChanged = (state: ConnectionState) => {
      if (!disposed) setConnection(state);
      if (state === ConnectionState.Connected && rtc && !isHost)
        void send({ type: "hello" }, session.hostId).catch(fail);
    };
    const disconnect = async () => {
      await rtc?.disconnect(true);
      if (mediaPrepared && !mediaReleased) {
        mediaReleased = true;
        await stopLiveMedia();
      }
    };
    const stopPublishing = async () => {
      if (!rtc) return;
      await releaseLocalCapture(rtc);
    };
    const appListener = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgrounded = true;
        void stopPublishing();
        if (
          !disposed &&
          (rtc?.localParticipant.isCameraEnabled ||
            rtc?.localParticipant.isMicrophoneEnabled)
        )
          setError(
            "Camera and microphone paused while Eventis was in the background. Turn them back on when ready.",
          );
      }
    });
    const visibility = () => {
      if (document.visibilityState === "hidden") {
        backgrounded = true;
        void stopPublishing();
      }
    };
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.addEventListener("visibilitychange", visibility);
    const timer = setInterval(() => {
      if (disposed) return;
      setNow(Date.now());
      if (!rtc || rtc.state !== ConnectionState.Connected) return;
      if (isHost) {
        if (
          Date.now() >= modelRef.current.endsAt &&
          !modelRef.current.endedAt
        ) {
          update({ ...modelRef.current, endedAt: Date.now() });
          void broadcast()
            .finally(() => {
              if (session.listing && session.controlToken)
                void liveDirectoryApi
                  .end(session.listing.id, session.controlToken)
                  .catch(() => {});
              void disconnect();
            })
            .catch(fail);
        }
      } else {
        if (rtc.remoteParticipants.has(session.hostId)) hostMissingAt = 0;
        else {
          hostMissingAt ||= Date.now();
          if (Date.now() - hostMissingAt > 15000) {
            update({ ...modelRef.current, endedAt: Date.now() });
            setReady(true);
            void disconnect();
          }
        }
        if (
          connectedAt &&
          Date.now() - connectedAt > 20000 &&
          !modelRef.current.endedAt &&
          !receivedSnapshot
        )
          setError(
            "The host has not responded. Go back to Live and try opening this broadcast again.",
          );
      }
    }, 1000);
    const heartbeat = setInterval(() => {
      if (
        disposed ||
        rtc?.state !== ConnectionState.Connected ||
        modelRef.current.endedAt
      )
        return;
      void (
        isHost ? broadcast() : send({ type: "hello" }, session.hostId)
      ).catch(fail);
      if (isHost && session.listing && session.controlToken)
        void liveDirectoryApi
          .heartbeat(
            session.listing.id,
            session.controlToken,
            true,
            roster().length,
          )
          .catch((e) => {
            if (disposed) return;
            if (e instanceof ApiError && [401, 403, 404].includes(e.status)) {
              update({ ...modelRef.current, endedAt: Date.now() });
              void disconnect();
            } else fail(e);
          });
    }, 5000);
    void (async () => {
      try {
        if (!liveProject.tokenServerId)
          throw new Error(
            "Add your LiveKit development token server ID to connect real devices.",
          );
        await prepareLiveMedia();
        mediaPrepared = true;
        if (disposed) {
          await disconnect();
          return;
        }
        const source = TokenSource.developmentTokenServer(
          liveProject.tokenServerId,
        );
        const credentials = await deadline(
          source.fetch({
            roomName: session.code,
            participantIdentity: session.identity,
            participantName: name.slice(0, 64),
          }),
          20000,
        );
        if (disposed) return;
        if (!credentials.serverUrl.startsWith("wss://"))
          throw new Error(
            "LiveKit must provide a secure wss:// connection URL.",
          );
        if (
          liveProject.serverUrl &&
          new URL(credentials.serverUrl).host !==
            new URL(liveProject.serverUrl).host
        )
          throw new Error(
            "The token server belongs to a different LiveKit project.",
          );
        rtc = new Room({
          adaptiveStream:
            Platform.OS === "web" ? true : { pixelDensity: "screen" },
          dynacast: true,
        });
        rtc
          .on(RoomEvent.DataReceived, onData)
          .on(RoomEvent.ConnectionStateChanged, connectionChanged);
        for (const event of [
          RoomEvent.ParticipantConnected,
          RoomEvent.ParticipantDisconnected,
          RoomEvent.ParticipantMetadataChanged,
          RoomEvent.ParticipantNameChanged,
          RoomEvent.TrackPublished,
          RoomEvent.TrackSubscribed,
          RoomEvent.TrackUnsubscribed,
          RoomEvent.TrackMuted,
          RoomEvent.TrackUnmuted,
          RoomEvent.LocalTrackPublished,
          RoomEvent.LocalTrackUnpublished,
        ])
          rtc.on(event, changed);
        rtc.on(RoomEvent.ActiveSpeakersChanged, () => {
          if (!disposed) setRevision((r) => r + 1);
        });
        removeAudio = attachRoomAudio(rtc);
        await deadline(
          rtc.connect(credentials.serverUrl, credentials.participantToken, {
            autoSubscribe: false,
          }),
          25000,
        );
        if (disposed) {
          await disconnect();
          return;
        }
        if (rtc.localParticipant.identity !== session.identity)
          throw new Error(
            "The token server did not preserve the requested participant identity.",
          );
        connectedAt = Date.now();
        if (
          session.profile?.avatar?.startsWith("http") &&
          session.profile.avatar.length <= 300
        )
          await rtc.localParticipant.setMetadata(
            JSON.stringify({ avatar: session.profile.avatar }),
          );
        setRoom(rtc);
        update(modelRef.current);
        if (isHost) {
          setReady(true);
          await broadcast();
          // Starting a broadcast is the explicit consent action. Viewers never publish automatically.
          const mediaErrors: string[] = [];
          try {
            if (!backgrounded)
              await rtc.localParticipant.setMicrophoneEnabled(true);
          } catch (e) {
            mediaErrors.push(`Microphone: ${messageOf(e)}`);
          }
          // Camera permission is independent: a denied microphone must not prevent video.
          try {
            if (!disposed && !backgrounded && session.mode === "video")
              await rtc.localParticipant.setCameraEnabled(true, {
                facingMode: facing.current,
              });
          } catch (e) {
            mediaErrors.push(`Camera: ${messageOf(e)}`);
          }
          if (mediaErrors.length)
            fail(
              new Error(
                `${mediaErrors.join(". ")}. Use the media controls to try again.`,
              ),
            );
          if (disposed) {
            await disconnect();
            return;
          }
        } else await send({ type: "hello" }, session.hostId);
        if (disposed) return;
        channel.current = {
          disconnect,
          act: async (action: LiveAction) => {
            if (!rtc || rtc.state !== ConnectionState.Connected)
              throw new Error("Wait for the room to reconnect.");
            if (isHost) {
              const state = apply({ id: session.identity, name }, action);
              await broadcast();
              if (action.type === "end") {
                if (session.listing && session.controlToken)
                  await liveDirectoryApi
                    .end(session.listing.id, session.controlToken)
                    .catch(() => {});
                await disconnect();
              }
              return state;
            }
            const allowed = parseGuestAction(action, session.code);
            if (!allowed) throw new Error("Only the host can do that.");
            const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            return new Promise<LiveState>((resolve, reject) => {
              const timeout = setTimeout(() => {
                acknowledgements.delete(id);
                reject(new Error("The host didn't respond. Please try again."));
              }, 8000);
              acknowledgements.set(id, { resolve, reject, timer: timeout });
              void send(
                { type: "action", id, action: allowed },
                session.hostId,
              ).catch((e) => {
                clearTimeout(timeout);
                acknowledgements.delete(id);
                reject(e);
              });
            });
          },
        };
      } catch (e) {
        fail(e);
        await disconnect().catch(() => {});
        // Disconnect emits its own state change; keep the retry UI visible after it completes.
        if (!disposed) {
          setReady(false);
          setConnection("failed");
        }
      }
    })();
    return () => {
      disposed = true;
      channel.current = null;
      clearInterval(timer);
      clearInterval(heartbeat);
      appListener.remove();
      removeAudio();
      if (Platform.OS === "web" && typeof document !== "undefined")
        document.removeEventListener("visibilitychange", visibility);
      for (const waiting of acknowledgements.values()) {
        clearTimeout(waiting.timer);
        waiting.reject(new Error("You left the room."));
      }
      rtc?.removeAllListeners();
      void disconnect().catch(() => {});
    };
  }, [session, name, isHost, attempt]);

  // LiveKit mutates its participant map in place. Snapshot it on SDK events so
  // React Compiler cannot reuse the roster from the initial connection.
  const participants = useMemo(
    () =>
      room ? [room.localParticipant, ...room.remoteParticipants.values()] : [],
    [room, revision],
  );
  const localMedia = useMemo(
    () => ({
      microphone: room?.localParticipant.isMicrophoneEnabled ?? false,
      camera: room?.localParticipant.isCameraEnabled ?? false,
    }),
    [room, revision],
  );
  const approvedGuest = model.guests.some((p) => p.id === session.identity);
  const canPublish = isHost || (approvedGuest && stageConsent);
  useEffect(() => {
    if (!approvedGuest) setStageConsent(false);
  }, [approvedGuest]);
  useEffect(() => {
    if (!room) return;
    // Only subscribe to the host and approved stage guests, even if a testing token permits extra publishing.
    const stageIds = new Set([
      session.hostId,
      ...model.guests.map((p) => p.id),
    ]);
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) {
        const subscribed = stageIds.has(participant.identity);
        if (publication.isDesired !== subscribed)
          publication.setSubscribed(subscribed);
      }
    }
  }, [room, session.hostId, model.guests, revision]);
  useEffect(() => {
    if (
      room &&
      (!canPublish ||
        model.endedAt ||
        model.blockedIds.includes(session.identity))
    ) {
      void releaseLocalCapture(room);
      if (
        (!isHost && model.endedAt) ||
        model.blockedIds.includes(session.identity)
      )
        void room.disconnect(true);
    }
  }, [
    room,
    canPublish,
    model.endedAt,
    model.blockedIds,
    session.identity,
    isHost,
  ]);
  const media = (kind: "mic" | "camera" | "flip" | "audio") => {
    mediaLock.current = mediaLock.current
      .catch(() => {})
      .then(async () => {
        if (!room || room.state !== ConnectionState.Connected)
          throw new Error("Connect to the room first.");
        if (kind === "audio") {
          await room.startAudio();
          return;
        }
        if (
          !(
            isHost ||
            (stageConsent &&
              modelRef.current.guests.some((p) => p.id === session.identity))
          ) ||
          modelRef.current.endedAt ||
          modelRef.current.blockedIds.includes(session.identity)
        )
          throw new Error(
            "Ask the host to join the stage before enabling your microphone or camera.",
          );
        if (kind === "mic") {
          if (room.localParticipant.isMicrophoneEnabled)
            await releaseLocalCapture(room, [Track.Source.Microphone]);
          else await room.localParticipant.setMicrophoneEnabled(true);
        }
        if (kind === "camera")
          await room.localParticipant.setCameraEnabled(
            !room.localParticipant.isCameraEnabled,
            { facingMode: facing.current },
          );
        if (kind === "flip") {
          const track = room.localParticipant.getTrackPublication(
            Track.Source.Camera,
          )?.track;
          if (!track) throw new Error("Turn on your camera first.");
          facing.current = facing.current === "user" ? "environment" : "user";
          await (
            track as import("livekit-client").LocalVideoTrack
          ).restartTrack({ facingMode: facing.current });
        }
        if (
          !isHost &&
          (!modelRef.current.guests.some((p) => p.id === session.identity) ||
            modelRef.current.endedAt ||
            modelRef.current.blockedIds.includes(session.identity))
        ) {
          await releaseLocalCapture(room);
          throw new Error("Your guest spot is no longer available.");
        }
        setError("");
        setRevision((r) => r + 1);
      })
      .catch((e) => setError(messageOf(e)));
  };
  const joinStage = async (settings: {
    microphone: boolean;
    camera: boolean;
    facing: "user" | "environment";
  }) => {
    if (
      !room ||
      room.state !== ConnectionState.Connected ||
      !modelRef.current.guests.some((p) => p.id === session.identity) ||
      modelRef.current.endedAt ||
      modelRef.current.blockedIds.includes(session.identity)
    )
      throw new Error("Your guest invitation is no longer available.");
    const errors: string[] = [];
    facing.current = settings.facing;
    setStageConsent(true);
    try {
      await room.localParticipant.setMicrophoneEnabled(settings.microphone);
    } catch (e) {
      errors.push(`Microphone: ${messageOf(e)}`);
    }
    try {
      if (session.mode === "video")
        await room.localParticipant.setCameraEnabled(settings.camera, {
          facingMode: settings.facing,
        });
    } catch (e) {
      errors.push(`Camera: ${messageOf(e)}`);
    }
    // The host may remove this seat while the operating system asks for permission.
    if (
      !modelRef.current.guests.some((p) => p.id === session.identity) ||
      modelRef.current.endedAt
    ) {
      await releaseLocalCapture(room);
      setStageConsent(false);
      throw new Error("Your guest spot is no longer available.");
    }
    setError(errors.join(". "));
    setRevision((r) => r + 1);
  };
  const act = (_actor: LivePerson, action: LiveAction) =>
    channel.current?.act(action) ??
    Promise.reject(new Error("The room is still connecting."));
  return {
    room,
    model,
    connection,
    error,
    ready,
    now,
    revision,
    participants,
    localMedia,
    approvedGuest,
    stageConsent,
    joinStage,
    canPublish,
    media,
    act,
    clearError: () => setError(""),
    retry: () => {
      setRoom(null);
      setAttempt((n) => n + 1);
    },
  };
}
