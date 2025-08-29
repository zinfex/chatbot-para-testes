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
  const [phoneId, setPhoneId] = useState<string>("5585982376724");
  // Em produção, a URL do webhook deve ser tratada no server (rota /api/webhook-relay) para evitar CORS.
  const [webhook, setWebhook] = useState<string>(
    "https://bvh-n8n.oviiko.easypanel.host/webhook/chatbot-bvh?teste=true"
  );
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [history, setHistory] = useState<ChatMsg[]>([
    {
      id: randomWamId(),
      from: "agent",
      text:
        `Olá, meu nome é David, fundador e CEO da Brazil Visa Hub.

Somos uma consultoria estratégica que apoia empreendedores e profissionais de sucesso em mobilidade global, expansão de negócios e investimentos internacionais.

Observamos que os líderes globais de hoje estão priorizando três objetivos principais. Para garantir que minha mensagem seja relevante, posso perguntar qual desses está mais alinhado com seu foco atual?

1️⃣ Mobilidade Pessoal – nova residência, cidadania ou mudança de estilo de vida
2️⃣ Expansão de Negócios – entrada em novos mercados como EUA, Europa ou Ásia
3️⃣ Gestão de Investimentos – investimentos internacionais e proteção de ativos

Uma resposta apenas com o número seria perfeita.`,
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
  
    // Append no histórico
    setHistory((h) => [
      ...h,
      { id: wamId, from: "you", text: userText, ts: Date.now() },
    ]);
    setInput("");
    setIsSending(true);
  
  
    try {
      const evolutionPayload = {
        event: "messages.upsert",
        instance: "teste",
        data: {
          key: {
            remoteJid: `${phoneId}@s.whatsapp.net`,
            fromMe: false,
            id: wamId,
          },
          pushName: "Arthur",
          status: "DELIVERY_ACK",
          message: {
            conversation: userText,
            messageContextInfo: {
              deviceListMetadata: {
                senderKeyHash: "abc123==",
                senderTimestamp: String(Math.floor(Date.now() / 1000)),
                recipientKeyHash: "def456==",
                recipientTimestamp: String(Math.floor(Date.now() / 1000) + 100),
              },
              deviceListMetadataVersion: 2,
              messageSecret: "fakeSecret==",
            },
          },
          messageType: "conversation",
          messageTimestamp: Math.floor(Date.now() / 1000),
          instanceId: "55cb4766-bad8-4637-bc2d-0d0706f3d745",
          source: "android",
        },
        destination: webhook,
        date_time: new Date().toISOString(),
        sender: `${phoneId}@s.whatsapp.net`,
        server_url: "https://bvh-evolution-api.oviiko.easypanel.host",
        apikey: "7E3A31243877-46FC-9453-E7F75368EB79",
      };
      
      const res = await fetch("/api/webhook-relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: evolutionPayload,
          webhook: webhook || undefined,
        }),
      });
      
      
      const raw = await res.text();
      if (!res.ok) {
        setHistory((h) => [
          ...h,
          {
            id: randomWamId(),
            from: "system",
            text: `Erro do webhook (HTTP ${res.status}). Resposta: ${raw.slice(
              0,
              1200
            )}`,
            ts: Date.now(),
          },
        ]);
        return;
      }
  
      // Se o seu webhook retorna resposta em texto
      setHistory((h) => [
        ...h,
        {
          id: randomWamId(),
          from: "agent",
          text: raw || "(sem resposta)",
          ts: Date.now(),
        },
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
