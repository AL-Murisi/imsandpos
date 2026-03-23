export const runtime = "nodejs";

import { NextRequest } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const system = (body?.system || "") as string;
    const messages = (body?.messages || []) as ChatMessage[];

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Messages are required" },
        { status: 400 },
      );
    }

    const payload = {
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages,
      ],
    };

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `Ollama error: ${text}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const message = data?.message?.content ?? "";

    return Response.json({ message });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Server error" },
      { status: 500 },
    );
  }
}
