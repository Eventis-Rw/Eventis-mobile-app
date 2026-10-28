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
