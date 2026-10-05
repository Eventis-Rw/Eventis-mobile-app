const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Exercise the real service against an isolated storage adapter; no RN runtime required.
let stored = new Map();
let failWrite = false;
const storage = {
  getItem: async (key) => stored.get(key) ?? null,
  setItem: async (key, value) => {
    if (failWrite) throw new Error("Storage unavailable");
    stored.set(key, value);
  },
};
const source = fs.readFileSync(
  path.join(__dirname, "../services/chatService.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;
const exportsObject = {};
new Function("require", "exports", compiled)((name) => {
  if (name === "@react-native-async-storage/async-storage") return storage;
  throw new Error(`Unexpected dependency: ${name}`);
}, exportsObject);
const { MockChatService, serializeChatService } = exportsObject;
const freshService = () => serializeChatService(new MockChatService());
beforeEach(() => {
  stored = new Map();
  failWrite = false;
});

test("phone lookup distinguishes registered, inviteable, and unknown identities", async () => {
  const service = freshService();
  assert.equal((await service.lookupPhone("+250700100001")).kind, "eventis");
  assert.equal((await service.lookupPhone("+250 700 100 005")).kind, "invite");
  assert.equal((await service.lookupPhone("+250700100999")).kind, "not_found");
  await assert.rejects(
    service.startConversation("contact-claudine"),
    /Only Eventis/,
  );
});

test("contact names and invitations persist and existing chats are reused", async () => {
  const service = freshService();
  await service.updateContactName("contact-aline", "My friend");
  await service.updateContact("contact-diane", {
    firstName: "Diane",
    lastName: "Uwera",
    phone: "+250 788 000 003",
    isInAddressBook: true,
    deviceContactId: "device-diane",
  });
  await service.inviteContact("contact-claudine");
  const snapshot = await freshService().load();
  assert.equal(
    snapshot.contacts.find((item) => item.id === "contact-aline").name,
    "My friend",
  );
  assert.equal(
    snapshot.contacts.find((item) => item.id === "contact-claudine").invited,
    true,
  );
  const diane = snapshot.contacts.find((item) => item.id === "contact-diane");
  assert.equal(diane.name, "Diane Uwera");
  assert.equal(diane.phone, "+250 788 000 003");
  assert.equal(diane.isInAddressBook, true);
  assert.equal(diane.deviceContactId, "device-diane");
  const existing = await service.startConversation("contact-aline");
  assert.equal(existing.id, "conversation-aline");
});

test("send, reply, edit, forward, delete, and clear update history and preview after reload", async () => {
  const service = freshService();
  const conversation = await service.startConversation("contact-patrick");
  const replyTo = { id: "message-a1", text: "Hello", direction: "incoming" };
  const sent = await service.sendMessage(
    conversation.id,
    "Meet at the event?",
    { replyTo },
  );
  await service.editMessage(conversation.id, sent.id, "Meet at 7?");
  const history = await freshService().getMessages(conversation.id);
  assert.equal(history[0].text, "Meet at 7?");
  assert.deepEqual(history[0].replyTo, replyTo);
  assert.ok(history[0].editedAt);
  const forwarded = await service.sendMessage(
    "conversation-kevin",
    history[0].text,
    { forwarded: true },
  );
  assert.equal(forwarded.forwarded, true);
  await assert.rejects(
    service.editMessage("conversation-aline", "message-a1", "Changed"),
    /own messages/,
  );
  await service.deleteMessage(conversation.id, sent.id);
  assert.equal((await service.getMessages(conversation.id)).length, 0);
  assert.equal(
    (await service.load()).conversations.find(
      (item) => item.id === conversation.id,
    ).lastMessage,
    "Start a conversation",
  );
  await service.clearConversation("conversation-kevin");
  assert.equal((await service.getMessages("conversation-kevin")).length, 0);
  await service.clearConversation(conversation.id, true);
  assert.equal(
    (await freshService().load()).conversations.some(
      (item) => item.id === conversation.id,
    ),
    false,
  );
});

test("concurrent actions retain messages, mute settings, and contact changes", async () => {
  const service = freshService();
  await service.load();
  await Promise.all([
    service.sendMessage("conversation-aline", "One"),
    service.sendMessage("conversation-aline", "Two"),
    service.setMuted("conversation-aline", true),
    service.updateContactName("contact-aline", "Aline C"),
  ]);
  const snapshot = await freshService().load();
  assert.equal(
    snapshot.messages.filter(
      (item) => item.text === "One" || item.text === "Two",
    ).length,
    2,
  );
  assert.equal(
    snapshot.conversations.find((item) => item.id === "conversation-aline")
      .muted,
    true,
  );
  assert.equal(
    snapshot.contacts.find((item) => item.id === "contact-aline").name,
    "Aline C",
  );
});

test("blocking stops sending and demo receiving, and reports remain explicitly local", async () => {
  const service = freshService();
  await service.setBlocked("contact-aline", true);
  await assert.rejects(
    service.sendMessage("conversation-aline", "Blocked"),
    /Unblock/,
  );
  await assert.rejects(
    service.simulateIncoming("conversation-aline"),
    /blocked/,
  );
  await service.setBlocked("contact-aline", false);
  const incoming = await service.simulateIncoming("conversation-aline");
  assert.equal(incoming.direction, "incoming");
  assert.equal(
    (await service.load()).conversations.find(
      (item) => item.id === "conversation-aline",
    ).unreadCount,
    3,
  );
  await service.markConversationRead("conversation-aline");
  assert.equal(
    (await service.load()).conversations.find(
      (item) => item.id === "conversation-aline",
    ).unreadCount,
    0,
  );
  assert.equal(
    (await service.reportContact("contact-aline", "Spam", incoming.id)).status,
    "saved_locally",
  );
});

test("failed persistence does not claim a saved message and the queue recovers", async () => {
  const service = freshService();
  await service.load();
  failWrite = true;
  await assert.rejects(
    service.sendMessage("conversation-aline", "Lost write"),
    /Storage unavailable/,
  );
  assert.equal(
    (await service.getMessages("conversation-aline")).some(
      (item) => item.text === "Lost write",
    ),
    false,
  );
  failWrite = false;
  await service.sendMessage("conversation-aline", "Recovered");
  assert.equal(
    (await freshService().getMessages("conversation-aline")).at(-1).text,
    "Recovered",
  );
});

test("photo and voice messages persist with useful previews", async () => {
  const service = freshService();
  const message = await service.sendMessage("conversation-aline", "", {
    imageUri: "data:image/jpeg;base64,AAAA",
  });
  assert.equal(
    (await freshService().getMessages("conversation-aline")).at(-1).imageUri,
    message.imageUri,
  );
  assert.equal((await service.load()).conversations[0].lastMessage, "Photo");
  const voice = await service.sendMessage("conversation-aline", "", {
    audioUri: "file:///eventis-demo-voice.m4a",
    audioDurationMs: 3200,
  });
  const reloadedVoice = (
    await freshService().getMessages("conversation-aline")
  ).at(-1);
  assert.equal(reloadedVoice.audioUri, voice.audioUri);
  assert.equal(reloadedVoice.audioDurationMs, 3200);
  assert.equal(
    (await service.load()).conversations[0].lastMessage,
    "Voice message",
  );
});

test("oversize state and empty messages are rejected", async () => {
  const service = freshService();
  await assert.rejects(
    service.sendMessage("conversation-aline", "", {
      imageUri: "A".repeat(1600000),
    }),
    /storage is full/,
  );
  await assert.rejects(
    service.sendMessage("conversation-aline", "  "),
    /Enter a message/,
  );
});
