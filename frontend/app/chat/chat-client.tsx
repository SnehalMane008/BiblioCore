"use client";

import { useEffect, useState } from "react";
import { api, Source } from "@/lib/api";
import { Card, Loading, PaperPicker, SourceCards, ToolHero } from "@/components/ui";
import { Bot, RotateCcw, Send, UserRound } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };
type SavedChat = { id: string; title: string };
type ChatDetail = { id: string; paper_ids: string[]; messages: Message[] };

export default function ChatClient({ initialPaper }: { initialPaper?: string }) {
  const [selected, setSelected] = useState<string[]>(initialPaper ? [initialPaper] : []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [question, setQuestion] = useState("");
  const [chatId, setChatId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<SavedChat[]>("/api/chats").then(setSavedChats).catch(() => {});
  }, []);

  async function loadChat(id: string) {
    setError("");
    try {
      const chat = await api<ChatDetail>(`/api/chats/${id}`);
      setChatId(chat.id);
      setSelected(chat.paper_ids);
      setMessages(chat.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load conversation");
    }
  }

  async function ask(text = question) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    setQuestion("");
    try {
      const result = await api<{ chat_id: string; answer: string; sources: Source[] }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ question: text, paper_ids: selected, chat_id: chatId }),
      });
      setChatId(result.chat_id);
      setMessages((current) => [...current, { role: "assistant", content: result.answer, sources: result.sources }]);
      api<SavedChat[]>("/api/chats").then(setSavedChats).catch(() => {});
    } catch (e) {
      setQuestion(text);
      setError(e instanceof Error ? e.message : "Could not get an answer");
    } finally {
      setBusy(false);
    }
  }

  function newConversation() { setChatId(undefined); setMessages([]); setError(""); }

  return <>
    <ToolHero eyebrow="Retrieval-augmented research" title="Ask your papers, with evidence" description="BiblioCore searches the indexed passages in your library, answers from those excerpts, and attaches the exact paper pages used for each response." icon={Bot} points={["Semantic retrieval", "Grounded answers", "Page-level citations"]}/>
    {savedChats.length > 0 && <Card className="mb-4">
      <div className="mb-3 text-xs font-semibold text-muted">Recent conversations</div>
      <div className="flex flex-wrap gap-2">{savedChats.map((chat) => <button key={chat.id} onClick={() => loadChat(chat.id)} className={`max-w-60 truncate rounded-lg border px-3 py-2 text-xs ${chatId === chat.id ? "border-blue bg-pale text-blue" : "border-line text-slate-600"}`}>{chat.title}</button>)}</div>
    </Card>}
    <Card>
      <div className="mb-2 text-xs font-semibold text-muted">Search across all papers, or select a subset</div>
      <PaperPicker selected={selected} setSelected={setSelected} />
    </Card>
    <Card className="mt-4 min-h-[420px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3"><div><h2 className="font-bold">Research conversation</h2><p className="mt-1 text-sm text-muted">Answers use only relevant indexed passages.</p></div><button onClick={newConversation} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-muted hover:border-blue hover:text-blue"><RotateCcw size={15}/>New conversation</button></div>
      <div className="max-h-[440px] space-y-5 overflow-y-auto scrollbar">
        {messages.map((message, index) => <div key={index} className="flex gap-3">
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${message.role === "assistant" ? "bg-pale text-blue" : "bg-slate-100 text-slate-600"}`}>{message.role === "assistant" ? <Bot size={16} /> : <UserRound size={16} />}</div>
          <div className="min-w-0 flex-1"><div className="mb-1 text-sm font-bold">{message.role === "assistant" ? "Research Assistant" : "You"}</div><p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{message.content}</p>{message.sources?.length ? <SourceCards sources={message.sources} /> : message.role === "assistant" ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">No passages met the relevance threshold for this answer. Try a more specific question or select different papers.</p> : null}</div>
        </div>)}
        {busy && <div className="flex items-center gap-2 text-sm text-muted"><Loading />Searching your papers and generating a grounded answer…</div>}
        {!messages.length && <div className="py-9 text-center"><Bot className="mx-auto text-blue" /><h3 className="mt-3 font-semibold">What would you like to understand?</h3><p className="mt-1 text-sm text-muted">Try one of these questions</p><div className="mt-5 flex flex-wrap justify-center gap-2">{["What is the main objective?", "Which datasets were used?", "What are the key results?", "What limitations do the authors mention?"].map((suggestion) => <button key={suggestion} onClick={() => ask(suggestion)} className="rounded-full border border-line px-3 py-2 text-xs hover:border-blue">{suggestion}</button>)}</div></div>}
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="mt-5 flex gap-2 border-t border-line pt-4"><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about your research papers…" className="min-w-0 flex-1 rounded-lg border border-line px-4 py-3 text-sm focus:border-blue focus:outline-none" /><button disabled={busy || !question.trim()} className="grid h-11 w-12 place-items-center rounded-lg bg-blue text-white disabled:opacity-50"><Send size={17} /></button></form>
    </Card>
  </>;
}
