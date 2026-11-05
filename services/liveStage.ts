import type { Participant, Track } from "livekit-client";
import type { LiveVoice } from "@/hooks/useLiveBroadcast";
import type { LivePerson } from "./liveState";

/** Approval order is stable even when tracks connect, mute, or reconnect. */
export function liveStageMembers(participants: Participant[], host: LivePerson, guests: LivePerson[], voice: LiveVoice, connected: boolean) {
  const people = [host, ...guests.filter((guest, index) => guest.id !== host.id && guests.findIndex(g => g.id === guest.id) === index).slice(0, 4)];
  return people.map(person => {
    const participant = participants.find(p => p.identity === person.id);
    const camera = participant?.getTrackPublication("camera" as Track.Source);
    const microphone = connected && !!voice[person.id]?.microphone;
    return {
      person, participant, isHost: person.id === host.id,
      hasVideo: connected && !!camera?.track && !camera.isMuted,
      cameraPending: connected && !!camera && !camera.isMuted && !camera.track,
      microphone, speaking: microphone && !!voice[person.id]?.speaking,
    };
  });
}
export type LiveStageMember = ReturnType<typeof liveStageMembers>[number];
export type LiveStageActions = {
  onEmpty: () => void;
  onMember: (person: LivePerson) => void;
  emptyLabel: string;
  emptyDisabled: boolean;
  ownId: string;
  isHost: boolean;
};
