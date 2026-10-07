import ChatClient from "./chat-client";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ paper?: string }> }) {
  const { paper } = await searchParams;
  return <ChatClient initialPaper={paper} />;
}
