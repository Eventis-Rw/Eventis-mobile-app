# Chat workspace

Chat opens at `/chat` in the root stack, outside `(tabs)`. The tab only pushes that route, so returning restores the previous app section. Inbox, conversation and contact screens share a nested stack with a back button and slide transition.

## Current local experience

The existing `ChatService` interface is the data boundary. `ChatContext` manages UI state; `MockChatService` persists demo contacts, conversations, messages, mute/block settings and reports to AsyncStorage. Operations run serially to prevent lost updates. Failed writes propagate to the UI. Small photo data URIs are supported with storage limits; real media needs an upload service. Drafts are device settings and are saved separately.

The inbox shows a single conversation list with All/Unread filters. Search and the new-chat button open `/chat/search`, which searches saved contacts, normalized phone numbers and message history together. Tap a contact to start/resume a chat; tap a message result to jump to its context. Contact names can be edited from contact details.

Long press a message for reply, copy, share, forward, edit (outgoing text only), delete for me and report. Swipe right to reply; tap a photo to preview it. Conversations use an inverted message list to anchor short histories and new messages next to the composer. A jump-to-latest button appears while reading older messages. In-chat search highlights matches in their history with older/newer navigation. Bottom padding reserves only the system safe area overlapping the actual viewport and is removed while the keyboard is visible.

Conversation options support mute, clear, delete, and an explicit **Receive a demo reply** control. Long press an inbox row for options, including receiving a demo message to exercise unread counts and the notification banner. Muting suppresses this banner. Blocking prevents local sending/receiving. Reports say **saved locally**, never submitted. Presence and message receipts are explicitly demo state; nothing is sent over a network. There are no OS push notifications or voice/video calls.

## Backend integration

Replace the service exported from `services/chatService.ts` with an implementation of `ChatService`. Map phone lookup, contact identities, conversation membership, message IDs, reply references, editing, deletion, moderation and preferences to authenticated server operations. Enforce permissions on the server, including membership, sender ownership and blocking. Preserve stable IDs and timestamps. Treat contact aliases as private to each user's address book.

For real-time delivery, feed incoming messages, typing, presence and delivery/read receipt events into `ChatContext`; use server-issued status rather than advancing it from the demo control. The current `simulateIncoming` method is a demo harness, not an API endpoint. Hide that control and change demo copy once a real service is configured. Replace the full local snapshot with paginated conversation/history loading when dataset size requires it.

Use signed media upload/download URLs instead of data URIs. Add OS notification permission, device registration and push delivery only with notification backend support. Never synchronize historical demo reports or messages as genuine user activity. Scope real persisted caches by authenticated user and clear them on logout. Do not interpret local `sent` as proof of server delivery.

## Verification

Run `pnpm typecheck`, `pnpm test:chat`, and `pnpm exec expo export --platform all`. Service tests cover identity lookup, invitations, aliases, concurrent mutations, message actions, persistence failures, blocking, reports and photos.

In the app, enter Chat from any main tab, verify tabs disappear, then return with the top-left button. Send a message, reply, edit, forward, delete and search it. Open contact details, rename, block/unblock and save a report. Reload to check persistence. Use inbox options to receive a demo message, open the banner and verify unread clears. Repeat while muted to verify banner suppression. Check photo picker cancellation and long multiline input on a device, including keyboard opening and closing.
