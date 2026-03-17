import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Film, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { streamChat } from "@/lib/chat-stream";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const OnboardingPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial message
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Olá! Bem-vindo(a) ao CineMatch. Sou seu assistente pessoal de filmes. Para te dar as melhores recomendações, preciso te conhecer um pouquinho melhor. Que tal começarmos com algumas perguntas rápidas sobre o que você realmente gosta e o que definitivamente não quer ver?",
        },
      ]);
    }
  }, [messages.length, isLoading]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === "streaming") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { id: "streaming", role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        endpoint: "onboarding-chat",
        onDelta: upsertAssistant,
        onDone: async () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === "streaming" ? { ...m, id: Date.now().toString() } : m))
          );
          setIsLoading(false);

          // Check if AI said the final keyword to finish onboarding
          if (assistantSoFar.toLowerCase().includes("experiência personalizada") || assistantSoFar.toLowerCase().includes("🎬")) {
            finishOnboarding();
          }
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Erro", description: error });
          setIsLoading(false);
        },
      });
    } catch {
      toast({ variant: "destructive", title: "Erro de conexão" });
      setIsLoading(false);
    }
  };

  const finishOnboarding = async () => {
    setIsFinishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          complete: true
        }),
      });

      if (response.ok) {
        toast({ title: "Tudo pronto!", description: "Seu perfil foi configurado com sucesso." });
        setTimeout(() => navigate("/"), 2000);
      } else {
        throw new Error("Falha ao finalizar onboarding");
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao salvar perfil", description: "Tente novamente." });
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="px-6 py-8 border-b border-border/10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mb-4 cinema-glow">
          <Sparkles className="text-primary-foreground" size={24} />
        </div>
        <h1 className="text-2xl font-black tracking-display mb-2">Primeiros Passos</h1>
        <p className="text-sm text-muted-foreground">Vamos montar seu perfil cinéfilo</p>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="max-w-2xl mx-auto space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm shadow-xl ${
                    msg.role === "user"
                      ? "gradient-primary text-primary-foreground rounded-tr-none"
                      : "glass text-foreground/90 rounded-tl-none border border-white/5"
                  }`}
                >
                  <div className="prose prose-sm prose-invert max-w-none [&_strong]:text-foreground [&_p]:leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && !isFinishing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5 text-xs text-muted-foreground glass rounded-2xl px-4 py-3 w-fit"
            >
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full gradient-primary animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full gradient-primary animate-pulse [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full gradient-primary animate-pulse [animation-delay:0.4s]" />
              </div>
              CineMatch está digitando...
            </motion.div>
          )}

          {isFinishing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10 text-center"
            >
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-lg font-bold">Criando sua experiência personalizada...</p>
              <p className="text-sm text-muted-foreground">Isso levará apenas um momento.</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-gradient-to-t from-background to-transparent">
        <div className="max-w-2xl mx-auto">
          {!isFinishing && (
            <div className="flex items-center gap-3 glass-surface rounded-2xl px-4 py-2 border border-white/5 shadow-2xl focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Responda aqui..."
                disabled={isLoading || isFinishing}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-3"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading || isFinishing}
                className="p-3 rounded-xl gradient-primary text-primary-foreground disabled:opacity-30 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
