import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { streamChat } from "@/lib/chat-stream";

const INITIAL_MESSAGE =
  "Seja bem-vindo ao CineMatch! ✨\n\nSou seu assistente pessoal de cinema e séries. Pra eu te recomendar os títulos perfeitos, preciso conhecer um pouco do seu gosto.\n\nMe conta: quais são seus 3 filmes ou séries favoritos da vida?";

const OnboardingPage = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: INITIAL_MESSAGE }]);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const finishOnboarding = async (chatHistory: string) => {
    try {
      const safeBio = (chatHistory || "").trim() || "Onboarding finalizado sem detalhes.";
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ taste_bio: safeBio, onboarding_complete: true } as any)
          .eq("user_id", user.id);
        if (error) {
          console.error("Profile save error:", error);
          throw error;
        }
        if (refreshProfile) await refreshProfile();
      } else {
        sessionStorage.setItem("guest_taste_bio", safeBio);
      }
      // Clear any skip flag so the user goes straight to personalized home
      sessionStorage.removeItem("onboarding_skipped");
      setOnboardingComplete(true);
      // Navigate immediately — no delay (avoids appearing stuck/blank)
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("finishOnboarding failed:", err);
      toast({
        variant: "destructive",
        title: "Erro ao salvar perfil",
        description: err?.message || "Tente novamente.",
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || onboardingComplete) return;

    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      let fullResponse = "";

      await streamChat({
        messages: newMessages.filter((m) => !m.isStreaming),
        mode: "onboarding",
        onDelta: (deltaText: string) => {
          fullResponse += deltaText;
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg?.role === "assistant" && lastMsg?.isStreaming) {
              return [...updated.slice(0, -1), { ...lastMsg, content: fullResponse }];
            } else {
              return [...updated, { role: "assistant", content: fullResponse, isStreaming: true }];
            }
          });
        },
        onDone: () => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg?.isStreaming) {
              const { isStreaming, ...rest } = lastMsg;
              return [...updated.slice(0, -1), rest];
            }
            return updated;
          });
          setLoading(false);

          // Check if AI signaled onboarding completion
          if (fullResponse.includes("[ONBOARDING_COMPLETE]")) {
            const chatHistory = [...newMessages, { role: "assistant", content: fullResponse }]
              .filter((m) => m.role === "user")
              .map((m) => m.content)
              .join("\n");
            finishOnboarding(chatHistory);
          }
        },
        onError: (error: string) => {
          toast({ variant: "destructive", title: error });
          setLoading(false);
        },
      });
    } catch (err) {
      console.error("Streaming error:", err);
      toast({ variant: "destructive", title: "Erro ao processar resposta" });
      setLoading(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem("onboarding_skipped", "true");
    navigate("/");
  };

  const handleFinishOnboarding = async () => {
    const chatHistory = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");
    await finishOnboarding(chatHistory);
  };

  // Clean [ONBOARDING_COMPLETE] from displayed messages
  const displayMessages = messages.map((m) => ({
    ...m,
    content: m.content.replace(/\[ONBOARDING_COMPLETE\]/g, "").trim(),
  }));

  return (
    <div className="min-h-dvh flex flex-col pt-8 pb-4 px-4 relative overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-10 bg-primary" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[150px] opacity-10 bg-accent" />
      </div>

      <div className="flex items-center justify-between mb-8 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles size={16} className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-black tracking-display">CineMatch</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSkip}
            className="text-xs px-3 py-1.5 rounded-full border border-border/30 bg-white/5 hover:bg-white/10 text-foreground/80 hover:text-foreground transition-colors"
          >
            Pular onboarding
          </button>
          {user && (
            <button
              onClick={signOut}
              className="text-xs text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <LogOut size={14} /> Sair
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full flex flex-col min-h-0 bg-transparent">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1 scrollbar-hide">
          <AnimatePresence initial={false}>
            {displayMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "gradient-primary text-primary-foreground rounded-br-none shadow-lg"
                      : "glass text-foreground/90 rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && !messages.some((m) => m.isStreaming) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-1.5 p-2 px-4 glass rounded-2xl w-fit"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
            </motion.div>
          )}

          {onboardingComplete && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <p className="text-sm text-muted-foreground">Redirecionando para sua home personalizada...</p>
            </motion.div>
          )}
        </div>

        {!onboardingComplete && (
          <div className="mt-4 pt-4 border-t border-border/10">
            <div className="flex gap-2">
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Digite sua resposta..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 transition-all shadow-lg"
              >
                <Send size={18} />
              </button>
            </div>

            {messages.filter((m) => m.role === "user").length >= 2 && (
              <div className="mt-4 flex gap-2 justify-center">
                <button
                  onClick={handleFinishOnboarding}
                  disabled={loading}
                  className="text-xs px-4 py-2 rounded-full gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Finalizar e ver recomendações
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
