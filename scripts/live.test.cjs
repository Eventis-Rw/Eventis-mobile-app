const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../services/liveState.ts'), 'utf8');
const api = {};
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(api);
const { createLiveState, reduceLive, activeRooms, tickLiveState, liveEligibility, LIVE_LIMITS } = api;
const now = Date.UTC(2026, 9, 27, 12);
const host = { id: 'host', name: 'Host' }, viewer = { id: 'viewer', name: 'Viewer' };
const draft = { title: 'Our room', mode: 'voice', chatEnabled: true, giftsEnabled: true };
function fixture() {
  let state = reduceLive(createLiveState(now), host, { type: 'start', draft }, now);
  const roomId = state.rooms[0].id;
  const run = (actor, action, at = now) => state = reduceLive(state, actor, { roomId, ...action }, at);
  run(viewer, { type: 'join' });
  return { run, roomId, get state() { return state; }, get room() { return state.rooms.find(r => r.id === roomId); } };
}
test('eligibility combines all free criteria; verification never bypasses safety', () => {
  const facts = { views: 500, publishedEvents: 1, joinedAt: now - 7 * 86400000, safetyApproved: true, suspended: false, verifiedOrganizer: false };
  assert.equal(liveEligibility(facts, now).eligible, true);
  for (const change of [{ views: 499 }, { publishedEvents: 0 }, { joinedAt: now }, { joinedAt: NaN }, { safetyApproved: false }, { suspended: true }]) assert.equal(liveEligibility({ ...facts, ...change }, now).eligible, false);
  assert.equal(liveEligibility({ ...facts, views: 0, verifiedOrganizer: true }, now).eligible, true);
  assert.equal(liveEligibility({ ...facts, verifiedOrganizer: true, suspended: true }, now).eligible, false);
});
test('creation is immutable, rejects empty titles and repeated/daily sessions', () => {
  const original = createLiveState(now);
  const next = reduceLive(original, host, { type: 'start', draft }, now);
  assert.equal(original.rooms.length, 3); assert.equal(next.rooms.length, 4);
  assert.throws(() => reduceLive(original, host, { type: 'start', draft: { ...draft, title: ' ' } }, now), /title/);
  assert.throws(() => reduceLive(next, host, { type: 'start', draft }, now), /active room/);
  const ended = reduceLive(next, host, { type: 'end', roomId: next.rooms[0].id }, now + 1);
  assert.throws(() => reduceLive(ended, host, { type: 'start', draft }, now + 2), /today/);
  assert.equal(activeRooms(reduceLive(ended, host, { type: 'start', draft }, now + 86400000), now + 86400000).length, 1);
});
test('capacity queues FIFO, duplicate joins do not duplicate queue; cancel releases position', () => {
  let state = createLiveState(now);
  const people = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  for (const p of people) state = reduceLive(state, p, { type: 'start', draft }, now);
  assert.equal(activeRooms(state, now).length, 5); assert.equal(state.queue.length, 3);
  state = reduceLive(state, people[2], { type: 'start', draft }, now); assert.equal(state.queue.length, 3);
  const closing = state.rooms[0]; state = reduceLive(state, closing.host, { type: 'end', roomId: closing.id }, now + 1);
  state = reduceLive(state, people[4], { type: 'start', draft }, now + 2); assert.equal(activeRooms(state, now + 2).length, 4);
  state = reduceLive(state, people[2], { type: 'cancelQueue' }, now + 2);
  state = reduceLive(state, people[3], { type: 'start', draft }, now + 3);
  assert.equal(activeRooms(state, now + 3).length, 5); assert.equal(state.queue[0].person.id, people[4].id);
});
test('requests deduplicate, only host accepts, max four guests enforced', () => {
  const f = fixture();
  f.run(viewer, { type: 'request' }); f.run(viewer, { type: 'request' }); assert.equal(f.room.requests.length, 1);
  assert.throws(() => f.run(viewer, { type: 'accept', person: viewer }), /Only the host/);
  f.run(host, { type: 'accept', person: viewer });
  for (let i = 0; i < 3; i++) { const p = { id: `guest${i}`, name: 'Guest' }; f.run(p, { type: 'join' }); f.run(p, { type: 'request' }); f.run(host, { type: 'accept', person: p }); }
  const fifth = { id: 'fifth', name: 'Fifth' }; f.run(fifth, { type: 'join' });
  assert.throws(() => f.run(fifth, { type: 'request' }), /four guest/);
  assert.equal(f.room.guests.length, 4);
  f.run(host, { type: 'remove', person: viewer }); assert.equal(f.room.guests.length, 3);
});
test('invitations require consent; leave clears seat, request and invitation', () => {
  const f = fixture(); f.run(host, { type: 'invite', person: viewer }); assert.equal(f.room.guests.length, 0);
  f.run(viewer, { type: 'acceptInvite' }); assert.equal(f.room.guests.length, 1); assert.equal(f.room.invitations.length, 0);
  f.run(viewer, { type: 'leave' }); assert.equal(f.room.guests.length, 0); assert.equal(f.room.audience.length, 0);
  assert.throws(() => f.run(viewer, { type: 'message', text: 'Hi' }), /Join/);
});
test('host can reject requests; declined invitations cannot later be accepted', () => {
  const f = fixture(); f.run(viewer, { type: 'request' }); f.run(host, { type: 'reject', person: viewer }); assert.equal(f.room.requests.length, 0);
  f.run(host, { type: 'invite', person: viewer }); f.run(viewer, { type: 'declineInvite' });
  assert.throws(() => f.run(viewer, { type: 'acceptInvite' }), /no longer/);
});
test('chat enforces moderation, membership, rate and length; block removes stage access', () => {
  const f = fixture(); f.run(viewer, { type: 'message', text: ' Hello ' }); assert.equal(f.room.messages[0].text, 'Hello');
  assert.throws(() => f.run(viewer, { type: 'message', text: 'spam' }), /wait/);
  f.run(host, { type: 'mute', person: viewer }); assert.throws(() => f.run(viewer, { type: 'message', text: 'Hi' }, now + 2000), /muted/);
  f.run(host, { type: 'unmute', person: viewer });
  assert.throws(() => f.run(viewer, { type: 'message', text: 'a'.repeat(241) }, now + 2000), /240/);
  f.run(host, { type: 'settings', chatEnabled: false, giftsEnabled: true }); assert.throws(() => f.run(viewer, { type: 'message', text: 'Hi' }), /paused/);
  f.run(host, { type: 'message', text: 'Host announcement' });
  f.run(viewer, { type: 'request' }); f.run(host, { type: 'accept', person: viewer }); f.run(host, { type: 'block', person: viewer });
  assert.equal(f.room.guests.length, 0); assert.equal(f.room.audience.length, 0);
  assert.throws(() => f.run(viewer, { type: 'join' }), /blocked/);
});
test('gifts are atomic and idempotent, reject overspend and never create cash earnings', () => {
  const f = fixture(); const gift = { type: 'gift', giftId: 'spotlight', transactionId: 'tx1' };
  f.run(viewer, gift); f.run(viewer, gift);
  assert.equal(f.state.wallets.viewer, 400); assert.equal(f.state.transactions.length, 1);
  assert.equal(f.room.messages.filter(m => m.kind === 'gift').length, 1);
  assert.throws(() => f.run(viewer, { ...gift, giftId: 'encore', transactionId: 'tx2' }), /Not enough/);
  assert.equal(f.state.wallets.viewer, 400); assert.equal(f.state.transactions.length, 1);
  assert.equal(f.state.wallets.host, undefined);
});
test('hosts and guests cannot self-gift and host can pause gifting', () => {
  const f = fixture(); const gift = { type: 'gift', giftId: 'spark', transactionId: 'a' };
  assert.throws(() => f.run(host, gift), /cannot gift/);
  f.run(host, { type: 'settings', chatEnabled: true, giftsEnabled: false }); assert.throws(() => f.run(viewer, gift), /paused/);
  f.run(host, { type: 'settings', chatEnabled: true, giftsEnabled: true });
  f.run(viewer, { type: 'request' }); f.run(host, { type: 'accept', person: viewer }); assert.throws(() => f.run(viewer, gift), /cannot gift/);
});
test('daily gifting cap is enforced independently of available balance', () => {
  const f = fixture(); f.state.wallets.viewer = 2000;
  f.run(viewer, { type: 'gift', giftId: 'encore', transactionId: 'a' }); f.run(viewer, { type: 'gift', giftId: 'encore', transactionId: 'b' });
  assert.throws(() => f.run(viewer, { type: 'gift', giftId: 'spark', transactionId: 'c' }), /daily/);
  assert.equal(f.state.wallets.viewer, 1000);
});
test('wall-clock expiration works after backgrounding and persisted reloads', () => {
  const f = fixture(); const reloaded = JSON.parse(JSON.stringify(f.state));
  const expired = tickLiveState(reloaded, now + LIVE_LIMITS.durationMs);
  assert.equal(activeRooms(expired, now + LIVE_LIMITS.durationMs).length, 0);
  assert.equal(expired.rooms.every(r => r.audience.length === 0), true);
  assert.throws(() => reduceLive(expired, viewer, { type: 'join', roomId: f.roomId }, now + LIVE_LIMITS.durationMs), /ended/);
  assert.deepEqual(tickLiveState(expired, now + LIVE_LIMITS.durationMs + 1), expired);
});
test('guest identities at gift time remain in the ledger after guests leave', () => {
  const f = fixture(); const guest = { id: 'guest', name: 'Guest' };
  f.run(guest, { type: 'join' }); f.run(guest, { type: 'request' }); f.run(host, { type: 'accept', person: guest });
  f.run(viewer, { type: 'gift', giftId: 'spark', transactionId: 'tx' }); f.run(guest, { type: 'leave' });
  assert.deepEqual(f.state.transactions[0].guestIds, ['guest']);
});
test('persisted data is validated and corrupt rooms are rejected before rendering', () => {
  const f = fixture(); f.run(viewer, { type: 'gift', giftId: 'spark', transactionId: 'stored' });
  assert.deepEqual(api.readLiveState(JSON.stringify(f.state), now), f.state);
  assert.throws(() => api.readLiveState('{broken', now));
  assert.throws(() => api.readLiveState(JSON.stringify({ ...f.state, rooms: [null] }), now), /could not be read/);
  assert.throws(() => api.readLiveState(JSON.stringify({ ...f.state, wallets: { viewer: -10 } }), now), /could not be read/);
});
