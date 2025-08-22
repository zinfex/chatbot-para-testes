"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

type Role = "you" | "agent" | "system";
type ChatMsg = { id: string; from: Role; text: string; ts: number };

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
  const [webhook, setWebhook] = useState<string>("https://app-n8n.ucspdi.easypanel.host/webhook/fb6269a0-fe15-4805-b3d1-8c01b2b6e9a4?teste=true"); // opcional: use só em dev
  const [extraHeaders, setExtraHeaders] = useState<string>("{}"); // {"Authorization":"Bearer ..."}
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
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

  async function sendMessage() {
    if (!input.trim() || isSending) return;

    // (Opcional) valida JSON de headers extras
    let headersExtra: Record<string, string> = {};
    try {
      const parsed = JSON.parse(extraHeaders || "{}");
      if (parsed && typeof parsed === "object") headersExtra = parsed;
    } catch {
      setHistory((h) => [
        ...h,
        {
          id: randomWamId(),
          from: "system",
          text:
            "Headers extras inválidos (não é JSON). Ajuste o campo ou deixe vazio. Enviando sem headers extras.",
          ts: Date.now(),
        },
      ]);
    }

    const userText = input.trim();
    const wamId = randomWamId();

    // Mostra a mensagem do usuário
    setHistory((h) => [...h, { id: wamId, from: "you", text: userText, ts: Date.now() }]);
    setInput("");
    setIsSending(true);

    // Payload no formato que você já usa
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
      // Chama a rota server-side (sem CORS no servidor)
      const res = await fetch("/api/webhook-relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          webhook: webhook || undefined, // em produção, remova e use ENV no server
          extraHeaders: Object.keys(headersExtra).length ? headersExtra : undefined,
        }),
      });

      // Lê a resposta do servidor proxy (que repassa o retorno do webhook)
      const contentType = res.headers.get("content-type") || "";
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

      // Tenta interpretar JSON (se a API do webhook responder em JSON), senão mostra texto puro
      let replyText = raw;
      if (contentType.includes("application/json")) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.messages?.[0]?.text?.body) {
            replyText = parsed.messages[0].text.body;
          } else if (parsed?.message) {
            replyText = parsed.message;
          } else {
            replyText = JSON.stringify(parsed, null, 2);
          }
        } catch {
          // mantém texto
        }
      }

      setHistory((h) => [
        ...h,
        { id: randomWamId(), from: "agent", text: replyText, ts: Date.now() },
      ]);
    } catch (err: any) {
      setHistory((h) => [
        ...h,
        {
          id: randomWamId(),
          from: "system",
          text: `Falha no relay: ${String(err?.message || err)}`,
          ts: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col">
      {/* Header fixo */}
      {/* <header className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-2 fixed top-0 left-0 right-0 z-50">
        <span className="font-semibold">Número:</span>
        <input
          className="rounded px-2 py-1 text-white text-sm border border-white/30 bg-transparent"
          value={phoneId}
          onChange={(e) => setPhoneId(e.target.value)}
        />
        <span className="font-semibold">Webhook (dev):</span>
        <input
          className="rounded px-2 py-1 text-white text-sm border border-white/30 bg-transparent w-[26rem] max-w-[40vw]"
          value={webhook}
          onChange={(e) => setWebhook(e.target.value)}
          placeholder="https://seu-webhook (deixe vazio se usar ENV no servidor)"
        />
      </header> */}

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
                {m.from === "you" ? "Você" : m.from === "agent" ? "Chatbot" : "Sistema"} ·{" "}
                {formatTime(m.ts)}
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
          aria-label="Enviar"
          title="Enviar"
        >
          <Send className="w-4 h-4" />
        </button>
      </footer>

     
    </div>
  );
}
