const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const load = (file, dependencies = {}) => {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', 'process', code)(exports, name => { if (dependencies[name]) return dependencies[name]; throw Error(`Unexpected dependency ${name}`); }, { env: {} });
  return exports;
};
const domain = load('services/liveState.ts');
const protocol = load('services/liveBroadcastProtocol.ts', { './liveState': domain });
const session = protocol.createBroadcastSession('Friday soundcheck', 'video', 'abcdefghijklmnop');
const room = () => protocol.initialBroadcastRoom(session, { id: session.identity, name: 'Host' });

test('room codes preserve the exact room and host identity across different phones', () => {
  const guest = protocol.joinBroadcastSession(` ${session.code.toUpperCase()} `, 'guestnonce');
  assert.equal(guest.code, session.code); assert.equal(guest.hostId, session.identity);
  assert.notEqual(guest.identity, session.identity); assert.equal(guest.hosting, false); assert.equal(guest.mode, 'video');
  const voice = protocol.createBroadcastSession('Talk', 'voice', 'zyxwvutsrqponmlk');
  assert.equal(protocol.joinBroadcastSession(voice.code, 'othernonce').mode, 'voice');
  for (const code of ['', 'room-123', 'ev1-v-short', 'https://example.com']) assert.throws(() => protocol.joinBroadcastSession(code, 'nonce'), /full Eventis/);
  assert.throws(() => protocol.createBroadcastSession(' ', 'video', 'abcdefghijklmnop'), /title/);
});
test('guest packets cannot invoke host commands or forge the actor/target', () => {
  assert.equal(protocol.parseGuestAction({ type: 'end', roomId: session.code }, session.code), null);
  assert.equal(protocol.parseGuestAction({ type: 'accept', person: { id: 'me' }, roomId: session.code }, session.code), null);
  assert.equal(protocol.parseGuestAction({ type: 'request', roomId: 'different' }, session.code), null);
  assert.equal(protocol.parseGuestAction({ type: 'message', roomId: session.code, text: 'x'.repeat(241) }, session.code), null);
  assert.deepEqual(protocol.parseGuestAction({ type: 'request', roomId: session.code, actor: session.identity }, session.code), { type: 'request', roomId: session.code });
  assert.deepEqual(protocol.parseGuestAction({ type: 'message', roomId: session.code, text: 'Hello', person: { id: session.hostId } }, session.code), { type: 'message', roomId: session.code, text: 'Hello' });
});
test('only the SDK host sender can supply a valid room snapshot', () => {
  const snapshot = protocol.serializeBroadcastRoom(room());
  assert.ok(protocol.parseHostSnapshot(snapshot, session.hostId, session));
  assert.equal(protocol.parseHostSnapshot(snapshot, 'attacker', session), null);
  assert.equal(protocol.parseHostSnapshot({ ...snapshot, id: 'other' }, session.hostId, session), null);
  assert.equal(protocol.parseHostSnapshot({ ...snapshot, host: { id: 'attacker', name: 'Fake' } }, session.hostId, session), null);
  assert.equal(protocol.parseHostSnapshot({ ...snapshot, giftsEnabled: true }, session.hostId, session), null);
  assert.equal(protocol.parseHostSnapshot({ ...snapshot, guests: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, name: 'Guest' })) }, session.hostId, session), null);
  assert.equal(protocol.parseHostSnapshot(null, session.hostId, session), null);
});
test('wire snapshots bound chat history and omit audience/photos from payloads', () => {
  const model = room(); model.audience = [{ id: 'viewer', name: 'Viewer' }];
  model.messages = Array.from({ length: 100 }, (_, i) => ({ id: `m${i}`, kind: 'chat', text: 'Hi', at: Date.now(), person: { id: 'viewer', name: 'Viewer', avatar: 'data:image/jpeg;base64,large' } }));
  const wire = protocol.serializeBroadcastRoom(model);
  assert.equal(wire.messages.length, 15); assert.deepEqual(wire.audience, []); assert.equal(wire.messages[0].person.avatar, undefined);
  assert.equal(model.messages.length, 100); assert.equal(model.audience.length, 1);
  assert.ok(Buffer.byteLength(JSON.stringify(wire)) < 15000);
});
test('directory reservations preserve server timing, event context and host identity for tap-to-watch', () => {
  const listing = { id: 'public-room', host: { id: 'account-host', name: 'Venue', avatar: 'https://example.com/logo.jpg' }, title: 'Friday soundcheck', mode: 'video', event: { id: 'event-1', title: 'Friday Fiesta', date: '2026-10-30', time: '19:00', location: 'Kigali', description: 'Live music', currency: 'RWF', isPaid: false, price: 0 }, startedAt: 1000, endsAt: 9000, availableUntil: 7000, viewers: 2, chatEnabled: false };
  const host = protocol.reservationSession({ kind: 'room', listing, roomName: session.code, hostIdentity: session.hostId, controlToken: 'private' }, { id: 'account-host', name: 'Venue' }, 'environment');
  const viewer = protocol.watchSession({ listing, roomName: session.code, hostIdentity: session.hostId }, { id: 'account-viewer', name: 'Viewer' }, 'viewernonce');
  assert.equal(host.hosting, true); assert.equal(viewer.hosting, false); assert.notEqual(viewer.identity, session.hostId); assert.equal(viewer.controlToken, undefined);
  const model = protocol.initialBroadcastRoom(viewer, { id: viewer.identity, name: 'Viewer' }, 2000);
  assert.equal(model.host.name, 'Venue'); assert.equal(model.host.id, session.hostId); assert.equal(model.eventId, 'event-1'); assert.equal(model.endsAt, 9000); assert.equal(model.chatEnabled, false);
  const wire = protocol.serializeBroadcastRoom(model); assert.equal(wire.host.avatar, 'https://example.com/logo.jpg');
});

test('stage contains only approved guests in approval order, including camera-off and connecting guests', () => {
  const { liveStageMembers } = load('services/liveStage.ts');
  const host = { id: 'host', name: 'Host' }, a = { id: 'a', name: 'A' }, b = { id: 'b', name: 'B' };
  const participant = (identity, camera) => ({ identity, getTrackPublication: () => camera });
  const members = liveStageMembers([participant('intruder', { track: {} }), participant('a', { track: {}, isMuted: true }), participant('host', { track: {}, isMuted: false })], host, [a, a, host, b], { a: { microphone: false, speaking: true }, host: { microphone: true, speaking: true } }, true);
  assert.deepEqual(members.map(m => m.person.id), ['host', 'a', 'b']);
  assert.equal(members[0].hasVideo, true); assert.equal(members[0].speaking, true);
  assert.equal(members[1].hasVideo, false); assert.equal(members[1].speaking, false);
  assert.equal(members[2].participant, undefined);
  assert.equal(liveStageMembers([], host, Array.from({ length: 8 }, (_, i) => ({ id: `g${i}`, name: 'Guest' })), {}, true).length, 5);
});

test('host microphone moderation is separate from chat and cannot be forged by guests', () => {
  const model = room(), host = model.host, guest = { id: 'guest', name: 'Guest' };
  let state = protocol.roomState(model);
  for (const [actor, action] of [[guest, { type: 'join' }], [guest, { type: 'request' }], [host, { type: 'accept', person: guest }]])
    state = domain.reduceLive(state, actor, { roomId: model.id, ...action });
  const action = { type: 'muteMicrophone', person: guest, roomId: model.id };
  assert.equal(protocol.parseGuestAction(action, model.id), null);
  assert.throws(() => domain.reduceLive(state, guest, action), /Only the host/);
  state = domain.reduceLive(state, host, action);
  const muted = state.rooms[0];
  assert.equal(muted.microphoneMutes.guest, 1);
  assert.deepEqual(muted.mutedIds, []);
  assert.equal(protocol.parseHostSnapshot(protocol.serializeBroadcastRoom(muted), session.hostId, session).microphoneMutes.guest, 1);
  state = domain.reduceLive(state, host, action);
  assert.equal(state.rooms[0].microphoneMutes.guest, 2);
  assert.equal(protocol.parseHostSnapshot({ ...muted, microphoneMutes: { guest: 'bad' } }, session.hostId, session), null);
  assert.throws(() => domain.reduceLive(state, host, { ...action, person: { id: 'viewer', name: 'Viewer' } }), /on stage/);
});

const { publishGuestMedia } = load('services/liveStageMedia.ts');
test('camera and audio are independent; a denied microphone still allows video', async () => {
  const calls = [];
  const errors = await publishGuestMedia({ microphone: async () => { throw Error('Permission denied'); }, camera: async on => calls.push(on), stop: async () => calls.push('stop') }, { microphone: true, camera: true }, () => true);
  assert.deepEqual(calls, [true]); assert.match(errors[0], /Microphone/);
});
test('audio-only guests never enable camera; failed capture can be retried', async () => {
  const calls = [];
  const controls = { microphone: async on => calls.push(['mic', on]), camera: async on => calls.push(['camera', on]), stop: async () => calls.push('stop') };
  await publishGuestMedia(controls, { microphone: true, camera: false }, () => true);
  assert.deepEqual(calls, [['mic', true], ['camera', false]]);
  await assert.rejects(publishGuestMedia({ ...controls, microphone: async () => { throw Error('Denied'); } }, { microphone: true, camera: false }, () => true), /Denied/);
  assert.equal(calls.at(-1), 'stop');
});
test('removal or backgrounding during a permission prompt stops capture and does not start the next device', async () => {
  let allowed = true; const calls = [];
  await assert.rejects(publishGuestMedia({ microphone: async () => { calls.push('mic'); allowed = false; }, camera: async () => calls.push('camera'), stop: async () => calls.push('stop') }, { microphone: true, camera: true }, () => allowed), /no longer available/);
  assert.deepEqual(calls, ['mic', 'stop']);
  allowed = true; calls.length = 0;
  await assert.rejects(publishGuestMedia({ microphone: async () => calls.push('mic'), camera: async () => { calls.push('camera'); allowed = false; }, stop: async () => calls.push('stop') }, { microphone: true, camera: true }, () => allowed), /no longer available/);
  assert.deepEqual(calls, ['mic', 'camera', 'stop']);
});

test('sample cards open the same shared room across devices without host privileges', () => {
  const a = protocol.sampleBroadcastSession('sample_0', { id: 'a', name: 'A' }, 'first');
  const b = protocol.sampleBroadcastSession('sample_0', { id: 'b', name: 'B' }, 'second');
  assert.equal(a.code, b.code);
  assert.notEqual(a.identity, b.identity);
  assert.equal(a.hosting, false);
  assert.equal(protocol.initialBroadcastRoom(a, a.profile).host.name, 'Kigali Jazz');
  assert.equal(protocol.sampleBroadcastSession('sample_2', a.profile, 'third').mode, 'voice');
  assert.throws(() => protocol.sampleBroadcastSession('unknown', a.profile, 'fourth'));
});
test('sample coordination is stable across roster order and transfers when the first participant leaves', () => {
  const first = { identity: 'z', joinedAt: new Date(100) }, second = { identity: 'a', joinedAt: new Date(200) };
  assert.equal(protocol.liveCoordinator([first, second]), 'z');
  assert.equal(protocol.liveCoordinator([second, first]), 'z');
  assert.equal(protocol.liveCoordinator([second]), 'a');
  assert.equal(protocol.liveCoordinator([]), undefined);
  const sample = protocol.sampleBroadcastSession('sample_0', { id: 'a', name: 'A' }, 'first');
  const model = protocol.initialBroadcastRoom(sample, sample.profile);
  assert.ok(protocol.parseHostSnapshot(model, 'z', sample, 'z'));
  assert.equal(protocol.parseHostSnapshot(model, 'a', sample, 'z'), null);
  assert.equal(protocol.parseHostSnapshot(model, 'z', sample), null);
  assert.equal(protocol.parseHostSnapshot(room(), 'z', session, 'z'), null);
});
test('sample gift packets are bounded and cannot enable gifts or host actions in ordinary broadcasts', () => {
  const gift = { type: 'gift', roomId: session.code, giftId: 'rose', transactionId: 'gift-one' };
  assert.deepEqual(protocol.parseGuestAction(gift, session.code, true), gift);
  assert.equal(protocol.parseGuestAction(gift, session.code), null);
  assert.equal(protocol.parseGuestAction({ ...gift, giftId: 'unknown' }, session.code, true), null);
  assert.equal(protocol.parseGuestAction({ ...gift, transactionId: 'x'.repeat(161) }, session.code, true), null);
  assert.equal(protocol.parseGuestAction({ type: 'end', roomId: session.code }, session.code, true), null);
  assert.equal(protocol.parseGuestAction({ type: 'topUp', coins: 1000 }, session.code, true), null);
});
