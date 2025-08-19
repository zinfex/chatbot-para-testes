"use client"
import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

// Webhook Evolution API
const WEBHOOK_URL = "https://app-n8n.ucspdi.easypanel.host/webhook-test/fb6269a0-fe15-4805-b3d1-8c01b2b6e9a4";

function randomWamId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `wamid.${Date.now()}.${rand}`;
}

function formatTime(ts = Date.now()) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [phoneId, setPhoneId] = useState("5585982389724");
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState([
    {
      id: randomWamId(),
      from: "agent",
      text: "Olá! Sou o assistente da Brasil Visa Hub. Em que posso te apoiar hoje?",
      ts: Date.now(),
    },
  ]);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function sendMessage() {
    if (!input.trim()) return;
    const userText = input.trim();
    const wamId = randomWamId();

    const userMsg = { id: wamId, from: "you", text: userText, ts: Date.now() };
    setHistory((h) => [...h, userMsg]);
    setInput("");
    setIsSending(true);

    // Payload Evolution minimal
    const payload = {
      messages: [
        {
          id: wamId,
          type: "text",
          timestamp: String(Math.floor(Date.now() / 1000)),
          text: { body: userText },
        },
      ],
      metadata: {
        phone_number_id: phoneId,
      },
    };

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let replyText = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.messages?.[0]?.text?.body) replyText = parsed.messages[0].text.body;
        else if (parsed?.message) replyText = parsed.message;
      } catch (_) {}

      const agentMsg = {
        id: randomWamId(),
        from: "agent",
        text: replyText || "(sem resposta)",
        ts: Date.now(),
      };
      setHistory((h) => [...h, agentMsg]);
    } catch (err) {
      const errorMsg = {
        id: randomWamId(),
        from: "system",
        text: `Erro ao enviar: ${String(err)}`,
        ts: Date.now(),
      };
      setHistory((h) => [...h, errorMsg]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col">
      {/* Header */}
      <header className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-2">
        <span className="font-semibold">Número:</span>
        <input
          className="rounded px-2 py-1 text-black text-sm"
          value={phoneId}
          onChange={(e) => setPhoneId(e.target.value)}
        />
      </header>

      {/* Chat body */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.map((m) => (
          <div key={m.id} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.from === "you"
                  ? "bg-[#DCF8C6] text-black"
                  : m.from === "agent"
                  ? "bg-white text-black"
                  : "bg-yellow-100 text-black"
              }`}
            >
              <div className="text-[10px] opacity-60 mb-1">
                {m.from === "you" ? "Você" : m.from === "agent" ? "BVH" : "Sistema"} · {formatTime(m.ts)}
              </div>
              <div>{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <footer className="bg-[#f0f0f0] px-4 py-3 flex items-center gap-2">
        <input
          className="flex-1 rounded-full border px-4 py-2 text-sm text-blacks"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isSending}
          className="bg-[#25D366] text-white rounded-full p-3 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}
