import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { streamChat } from "@/lib/chat-stream";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Um terror psicológico brasileiro que não seja óbvio",
  "Algo leve pra assistir com a família no domingo",
  "Filmes parecidos com Cidade de Deus",
  "Documentário brasileiro impactante",
];

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };

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
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { id: "streaming", role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        onDelta: upsertAssistant,
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === "streaming" ? { ...m, id: Date.now().toString() } : m
            )
          );
          setIsLoading(false);
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Erro",
            description: error,
          });
          setIsLoading(false);
        },
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
      });
      setIsLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-1/3 -right-32 w-64 h-64 rounded-full bg-accent/5 blur-[100px]" />
      </div>

      {/* Scrollable area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 mx-auto cinema-glow animate-float">
                  <Sparkles className="text-primary-foreground" size={28} />
                </div>
                <h1 className="text-3xl font-black tracking-display mb-3">
                  <span className="gradient-text">O que vamos assistir?</span>
                </h1>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Me diga o clima, o gênero ou até um sentimento. Eu encontro o filme certo nas suas plataformas.
                </p>
              </motion.div>

              {/* Suggestions */}
              <div className="mt-10 flex flex-col gap-2.5 w-full max-w-sm">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                    onClick={() => handleSend(s)}
                    className="text-left text-sm px-4 py-3.5 rounded-2xl glass text-foreground/80 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]"
                  >
                    "{s}"
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="py-4 space-y-4 max-w-2xl mx-auto">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] text-sm shadow-lg">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="glass rounded-2xl p-4 max-w-[90%]">
                      <div className="prose prose-sm prose-invert max-w-none text-foreground/90 [&_strong]:text-foreground [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_ul]:space-y-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground glass rounded-2xl px-4 py-3 w-fit"
                >
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full gradient-primary animate-pulse-glow" />
                    <span className="w-2 h-2 rounded-full gradient-primary animate-pulse-glow [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full gradient-primary animate-pulse-glow [animation-delay:0.4s]" />
                  </div>
                  Buscando nos catálogos...
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 pb-safe">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 glass-surface rounded-2xl px-4 py-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all duration-300">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Descreva o que quer assistir..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2.5"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl gradient-primary text-primary-foreground disabled:opacity-30 transition-all hover:opacity-90 cinema-glow-sm"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
