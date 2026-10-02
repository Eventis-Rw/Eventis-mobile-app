import { Redirect } from "expo-router";

// The tab is an entry point; the chat workspace lives in the root stack.
export default function ChatEntry() {
  return <Redirect href="/chat" />;
}
