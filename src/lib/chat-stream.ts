import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

export async function streamChat({
  messages,
  mode,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  mode?: "onboarding" | "chat";
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
}) {
  const { data, error } = await supabase.functions.invoke<{ content?: string; error?: string }>("chat", {
    body: { messages, ...(mode ? { mode } : {}), stream: false },
  });

  if (error) {
    const msg = error.message || "Erro ao conectar com a IA";
    onError?.(msg);
    onDone();
    return;
  }

  if (!data?.content) {
    onError?.(data?.error || "Sem resposta do servidor");
    onDone();
    return;
  }

  onDelta(data.content);

  onDone();
}
