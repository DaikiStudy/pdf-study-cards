import type { Config, Context } from "@netlify/functions";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

// Simple in-memory rate limiter: max 20 requests per IP per minute
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "サーバーのAPIキーが設定されていません" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const clientIp = context.ip || "unknown";
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({
        error: "リクエスト制限に達しました。しばらく待ってから再試行してください。",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.text();
  if (body.length > 10 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: "リクエストが大きすぎます" }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const responseBody = await geminiRes.text();
    return new Response(responseBody, {
      status: geminiRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: `Gemini APIへの接続に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config: Config = {
  path: "/api/gemini-proxy",
};
