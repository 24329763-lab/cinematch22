import { lovable } from "@/integrations/lovable/index";

type Msg = { role: "user" | "assistant"; content: string };

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  endpoint = "chat",
}: {
  messages: Msg[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
  endpoint?: string;
}) {
  const { data: sessionData } = await lovable.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`;

  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
      let msg = "Erro ao conectar com a IA";
      try {
        const errorData = await resp.json();
        msg =
          resp.status === 429
            ? "Muitas requisições. Aguarde alguns segundos."
            : resp.status === 402
              ? "Créditos insuficientes. Adicione créditos ao workspace."
              : errorData.error || msg;
      } catch {
        // Fallback if parsing fails
      }

      onError?.(msg);
      onDone();
      return;
    }

    if (!resp.body) {
      onError?.("Sem resposta do servidor");
      onDone();
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          /* ignore */
        }
      }
    }
  } catch (err) {
    onError?.((err as Error).message || "Erro de conexão fatal");
  } finally {
    onDone();
  }
}
