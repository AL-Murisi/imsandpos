"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const SYSTEM_PROMPT =
  "You are a helpful assistant for an inventory management system. " +
  "Answer in clear, concise Arabic or English depending on the user's language. " +
  "Help with reports (sales, customers, suppliers, inventory, cash, bank) and explain what a report means. " +
  "If you are unsure, ask a short clarifying question.";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "أهلاً! كيف أقدر أساعدك في التقارير أو النظام؟ You can ask me about reports or data.",
    },
  ]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: nextMessages.filter((m) => m.role !== "system"),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Chat request failed");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data?.message ?? "" },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "حصل خطأ في الاتصال بالموديل المحلي. تأكد أن Ollama شغال.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-3 w-[92vw] max-w-sm rounded-xl border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-sm font-semibold">Chat مساعد</div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              type="button"
            >
              إغلاق
            </button>
          </div>
          <div
            ref={listRef}
            className="max-h-[50vh] space-y-3 overflow-y-auto px-4 py-3 text-sm"
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={
                  m.role === "user"
                    ? "ml-auto w-fit max-w-[80%] rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                    : "mr-auto w-fit max-w-[80%] rounded-lg bg-muted px-3 py-2 text-foreground"
                }
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto w-fit rounded-lg bg-muted px-3 py-2 text-foreground">
                ...
              </div>
            )}
          </div>
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="اكتب سؤالك هنا..."
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={sendMessage}
                className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
                type="button"
                disabled={loading}
              >
                إرسال
              </button>
            </div>
          </div>
        </div>
      )}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90"
          type="button"
        >
          Chat
        </button>
      )}
    </div>
  );
}
