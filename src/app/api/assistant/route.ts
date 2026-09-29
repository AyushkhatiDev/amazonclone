import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODEL, SYSTEM_PROMPT, TOOLS, runTool, PageContext, contextBlock, ContextSnaps } from "@/lib/assistant";
import { localAnswer } from "@/lib/localAssistant";

export const runtime = "nodejs";
export const maxDuration = 60;

type Msg = Anthropic.Beta.BetaMessageParam;

const Body = z.object({
  // Earlier turns exactly as the API returned them (thinking blocks included): replayed unchanged.
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.unknown() })).max(80),
  message: z.string().trim().min(1).max(1000),
  context: PageContext,
});

const MAX_USER_TURNS = 15;
const MAX_HISTORY_BYTES = 300_000;
const MAX_TOOL_ROUNDS = 6;

// Best-effort abuse guard for a public demo. Per server instance, so it resets on cold starts.
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

const isUserText = (m: Msg) => m.role === "user" && Array.isArray(m.content) && m.content.some((b) => b.type === "text");

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return Response.json({ error: "You're asking faster than I can keep up. Try again in a few minutes." }, { status: 429 });

  const raw = await req.text();
  if (raw.length > MAX_HISTORY_BYTES) return Response.json({ error: "This conversation is too long. Start a new chat." }, { status: 413 });
  const parsed = Body.safeParse(JSON.parse(raw || "{}"));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const { message, context } = parsed.data;
  const history = parsed.data.history as Msg[];

  // Roles must alternate starting with a user turn, as the API requires.
  if (history.some((m, i) => m.role !== (i % 2 === 0 ? "user" : "assistant"))) return Response.json({ error: "Bad history" }, { status: 400 });
  if (history.filter(isUserText).length >= MAX_USER_TURNS) {
    return Response.json({ error: "This chat has reached its limit. Start a new one to keep going." }, { status: 413 });
  }

  // Default: the built-in engine (free, instant, catalog-only). Claude is used only if a key is configured.
  if (!process.env.ANTHROPIC_API_KEY) return localResponse(message, context, history);

  const userTurn: Msg = {
    role: "user",
    content: [
      { type: "text", text: contextBlock(context) },
      { type: "text", text: message },
    ],
  };
  const messages: Msg[] = [...history, userTurn];
  const added: Msg[] = [userTurn];

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      send({ t: "products", items: ContextSnaps(context) });
      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const s = client.beta.messages.stream({
            model: MODEL,
            max_tokens: 8000,
            system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
            tools: TOOLS,
            messages,
            cache_control: { type: "ephemeral" },
            output_config: { effort: "low" },
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
          });
          let streamedText = false;
          s.on("text", (d) => {
            streamedText = true;
            send({ t: "text", d });
          });
          const msg = await s.finalMessage();

          if (msg.stop_reason === "refusal") {
            // Nothing from a declined turn goes into history.
            send({ t: "error", message: "I can't help with that one. Try asking about products, delivery or returns." });
            return;
          }

          messages.push({ role: "assistant", content: msg.content });
          added.push({ role: "assistant", content: msg.content });

          if (msg.stop_reason === "pause_turn") continue;
          if (msg.stop_reason === "max_tokens") {
            send({ t: "text", d: "\n\n(That answer got cut off. Ask me to continue.)" });
            break;
          }
          const calls = msg.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
          if (msg.stop_reason !== "tool_use" || calls.length === 0) break;
          if (round === MAX_TOOL_ROUNDS) {
            send({ t: "error", message: "That took too many steps. Try a more specific question." });
            return;
          }
          // Text written before a tool call is interim narration: clear it from the bubble.
          if (streamedText) send({ t: "reset" });

          const results: Anthropic.Beta.BetaToolResultBlockParam[] = calls.map((call) => {
            const r = runTool(call.name, call.input);
            send({ t: "status", text: r.status });
            if (r.products.length) send({ t: "products", items: r.products });
            return { type: "tool_result", tool_use_id: call.id, content: r.result, ...(r.isError ? { is_error: true } : {}) };
          });
          // All results for one assistant turn go back in a single user message.
          const toolTurn: Msg = { role: "user", content: results };
          messages.push(toolTurn);
          added.push(toolTurn);
        }
        send({ t: "done", messages: added });
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) send({ t: "error", message: "Lots of people are asking right now. Try again in a moment." });
        else if (err instanceof Anthropic.AuthenticationError) send({ t: "error", message: "Ask Bazaar isn't configured correctly." });
        else if (err instanceof Anthropic.BadRequestError) send({ t: "error", message: "Something went wrong with this chat. Start a new one." });
        else if (err instanceof Anthropic.APIError) send({ t: "error", message: "The assistant is having trouble. Try again shortly." });
        else send({ t: "error", message: "Something went wrong. Try again." });
        console.error("assistant error", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

function localResponse(message: string, context: PageContext, history: Msg[]) {
  const reply = localAnswer(message, context, history);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      send({ t: "status", text: reply.status });
      send({ t: "products", items: [...ContextSnaps(context), ...reply.products] });
      // Stream in word-sized chunks so the reply reads in, the same as the model path.
      for (const chunk of reply.text.match(/\S+\s*|\s+/g) ?? []) {
        send({ t: "text", d: chunk });
        await new Promise((r) => setTimeout(r, 8));
      }
      // Stored as a normal user/assistant pair, so follow-ups ("which one is cheaper?") can see what was shown.
      send({
        t: "done",
        messages: [
          { role: "user", content: [{ type: "text", text: message }] },
          { role: "assistant", content: [{ type: "text", text: reply.text }] },
        ],
      });
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
