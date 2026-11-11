import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  tool,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_VALUE } from "@/lib/auth";
import { DEFAULT_PROMPT } from "@/lib/agent/system-prompt";
import { orderSchema } from "@/lib/agent/schema";
export const maxDuration = 60;
async function authorized() {
  return (await cookies()).get(SESSION_COOKIE)?.value === SESSION_VALUE;
}
export async function GET() {
  if (!(await authorized()))
    return Response.json({ error: "Sesión requerida" }, { status: 401 });
  return Response.json({
    connected: !!process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  });
}
export async function POST(req: Request) {
  if (!(await authorized()))
    return Response.json({ error: "Sesión requerida" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json(
      {
        error:
          "Agente sin conectar. Configura ANTHROPIC_API_KEY para conversar con el agente.",
      },
      { status: 503 },
    );
  try {
    const body = await req.json();
    if (
      !Array.isArray(body.messages) ||
      body.messages.length > 100 ||
      JSON.stringify(body).length > 60000
    )
      return Response.json(
        { error: "Conversación inválida o demasiado larga" },
        { status: 400 },
      );
    const messages = body.messages as UIMessage[];
    const result = streamText({
      model: anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5"),
      system:
        typeof body.system === "string"
          ? body.system.slice(0, 12000)
          : DEFAULT_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: {
        registrarPedido: tool({
          description:
            "Proponer un pedido completo para aprobación del operador.",
          inputSchema: orderSchema,
          execute: async (input) => input,
        }),
      },
    });
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        onError: () =>
          "No se pudo completar la respuesta del agente. Revisa la conexión y el modelo configurado.",
      }),
    });
  } catch {
    return Response.json(
      { error: "No se pudo procesar la conversación" },
      { status: 400 },
    );
  }
}
