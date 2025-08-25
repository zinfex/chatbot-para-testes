"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

// Tipagens
type Role = "you" | "agent" | "system";
type ChatMsg = { id: string; from: Role; text: string; ts: number };

// Helpers
function randomWamId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `wamid.${Date.now()}.${rand}`;
}

function formatTime(ts: number = Date.now()): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [phoneId, setPhoneId] = useState<string>("5585982389724");
  // Em produção, a URL do webhook deve ser tratada no server (rota /api/webhook-relay) para evitar CORS.
  const [webhook, setWebhook] = useState<string>(
    "https://app-n8n.ucspdi.easypanel.host/webhook/fb6269a0-fe15-4805-b3d1-8c01b2b6e9a4?teste=true"
  );
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [history, setHistory] = useState<ChatMsg[]>([
    {
      id: randomWamId(),
      from: "agent",
      text:
        "Olá, aqui é da Brasil Visa Hub. Ajudamos investidores e famílias a estruturarem residência e negócios no Brasil com segurança e confidencialidade. Você tem interesse em morar, investir ou abrir empresa no Brasil?",
      ts: Date.now(),
    },
  ]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function sendMessage(): Promise<void> {
    if (!input.trim() || isSending) return;

    const userText: string = input.trim();
    const wamId: string = randomWamId();

    // Append da mensagem do usuário
    setHistory((h) => [...h, { id: wamId, from: "you", text: userText, ts: Date.now() }]);
    setInput("");
    setIsSending(true);

    // Payload no formato Evolution minimal
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
      // Rota server-side (proxy) que repassa ao webhook real sem headers extras
      const res = await fetch("/api/webhook-relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          webhook: webhook || undefined, // Em produção, prefira usar ENV no server
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();

      if (!res.ok) {
        setHistory((h) => [
          ...h,
          {
            id: randomWamId(),
            from: "system",
            text: `Erro do webhook (HTTP ${res.status}). Resposta: ${raw.slice(0, 1200)}`,
            ts: Date.now(),
          },
        ]);
        return;
      }

      let replyText: string = raw;
      if (contentType.includes("application/json")) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsed: unknown = JSON.parse(raw);
          if (typeof parsed === "object" && parsed !== null) {
            const p = parsed as Record<string, unknown>;
            const messages = p["messages"] as unknown;
            if (Array.isArray(messages) && messages[0] && typeof messages[0] === "object") {
              const first = messages[0] as Record<string, unknown>;
              const text = first["text"] as Record<string, unknown> | undefined;
              const body = text?.["body"];
              if (typeof body === "string") replyText = body;
            } else if (typeof p["message"] === "string") {
              replyText = p["message"] as string;
            } else {
              replyText = JSON.stringify(parsed, null, 2);
            }
          }
        } catch {
          // mantém texto bruto
        }
      }

      setHistory((h) => [
        ...h,
        { id: randomWamId(), from: "agent", text: replyText || "(sem resposta)", ts: Date.now() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setHistory((h) => [
        ...h,
        { id: randomWamId(), from: "system", text: `Falha no relay: ${msg}`, ts: Date.now() },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col">
      {/* Header (opcional) */}
      <header className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-2 fixed top-0 left-0 right-0 z-50">
        <h2>Brasil Visa Hub - Teste Chatbot</h2>
        {/* <span className="font-semibold">Número:</span>
        <input
          className="rounded px-2 py-1 text-white text-sm border border-white/30 bg-transparent"
          value={phoneId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneId(e.target.value)}
        />
        <span className="font-semibold">Webhook (dev):</span>
        <input
          className="rounded px-2 py-1 text-white text-sm border border-white/30 bg-transparent w-[26rem] max-w-[40vw]"
          value={webhook}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebhook(e.target.value)}
          placeholder="https://seu-webhook (deixe vazio se usar ENV no servidor)"
        /> */}
      </header>

      {/* Corpo do chat */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3 pt-24 pb-40">
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
                {m.from === "you" ? "Você" : m.from === "agent" ? "Chatbot" : "Sistema"} · {formatTime(m.ts)}
              </div>
              <div>{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* Footer fixo */}
      <footer className="bg-[#f0f0f0] px-4 py-3 flex items-center gap-2 text-black fixed bottom-0 left-0 right-0">
        <input
          className="flex-1 rounded-full border px-4 py-2 text-sm"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="Digite uma mensagem"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void sendMessage();
            }
          }}
        />
        <button
          onClick={() => void sendMessage()}
          disabled={!input.trim() || isSending}
          className="bg-[#25D366] text-white rounded-full p-3 disabled:opacity-50"
          aria-label="Enviar"
          title="Enviar"
        >
          <Send className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}
