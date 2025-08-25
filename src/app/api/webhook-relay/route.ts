import { NextRequest, NextResponse } from "next/server";

// Webhook padrão via ENV (produção)
const DEFAULT_WEBHOOK = process.env.WEBHOOK_URL || "";

// Tipos do body aceito
interface RelayBody {
  payload: unknown;   // JSON a ser repassado
  webhook?: string;   // opcional; se ausente, usa DEFAULT_WEBHOOK
}

// Helpers
function cors(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function POST(req: NextRequest) {
  try {
    // Parse seguro do body
    const raw = (await req.json()) as unknown;
    if (!isRecord(raw)) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: cors() }
      );
    }

    const body = raw as Partial<RelayBody>;
    const target = (typeof body.webhook === "string" && body.webhook) || DEFAULT_WEBHOOK;

    if (!target) {
      return NextResponse.json(
        { error: "Missing webhook URL (set WEBHOOK_URL env or provide body.webhook)" },
        { status: 400, headers: cors() }
      );
    }

    if (!("payload" in raw)) {
      return NextResponse.json(
        { error: "Missing 'payload' in request body" },
        { status: 400, headers: cors() }
      );
    }

    // Repassa o payload ao webhook alvo (sem headers extras)
    const upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.payload),
      // No server não há CORS para fetch do backend
    });

    // Preserva o content-type original quando possível
    const contentType = upstream.headers.get("content-type") ?? "text/plain; charset=utf-8";
    const text = await upstream.text();

    // Resposta transparente (pass-through)
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": contentType, ...cors() },
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Relay error", detail },
      { status: 500, headers: cors() }
    );
  }
}
