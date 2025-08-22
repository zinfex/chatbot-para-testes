import { NextRequest, NextResponse } from "next/server";

// Opcional: defina seu webhook fixo por ENV em produção
const DEFAULT_WEBHOOK = process.env.WEBHOOK_URL || "";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

/**
 * Espera receber no body:
 * {
 *   "payload": {...},               // obrigatório
 *   "webhook": "https://...",       // opcional se WEBHOOK_URL estiver setado
 *   "extraHeaders": { "Authorization": "Bearer ..." } // opcional
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { payload, webhook, extraHeaders } = await req.json();

    const target = (webhook && String(webhook)) || DEFAULT_WEBHOOK;
    if (!target) {
      return NextResponse.json(
        { error: "Missing webhook URL (env WEBHOOK_URL or body.webhook)" },
        { status: 400, headers: cors() }
      );
    }
    if (!payload) {
      return NextResponse.json(
        { error: "Missing 'payload' in request body" },
        { status: 400, headers: cors() }
      );
    }

    const res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(extraHeaders ?? {}),
      },
      body: JSON.stringify(payload),
      // IMPORTANTE: do lado do servidor não há CORS, então a resposta é legível
    });

    // Tentamos repassar o content-type original
    const ct = res.headers.get("content-type") || "text/plain; charset=utf-8";
    const raw = await res.text();

    // Você pode devolver raw (transparente) ou padronizar em JSON:
    // Opção A (transparente):
    return new NextResponse(raw, {
      status: res.status,
      headers: { "Content-Type": ct, ...cors() },
    });

    // Opção B (padronizada):
    // return NextResponse.json(
    //   { ok: res.ok, status: res.status, body: tryParseJSON(raw) },
    //   { status: res.status, headers: cors() }
    // );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Relay error", detail: String(err?.message || err) },
      { status: 500, headers: cors() }
    );
  }
}

// Utilitário caso queira padronizar
function tryParseJSON(text: string) {
  try { return JSON.parse(text); } catch { return text; }
}
