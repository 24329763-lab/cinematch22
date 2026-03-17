import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Film, Heart, Compass, Star, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { streamChat } from "@/lib/chat-stream";

const STEPS = [
  "Bora começar! Me conta: quais são seus 3 filmes favoritos da vida?",
  "E que tipo de clima você mais curte? (Suspense tenso, comédia relaxada, ação frenética...)",
  "Tem algum ator ou diretor que você assiste tudo o que faz?",
  "Boa! Quase lá. O que você MAIS ODEIA em um filme?",
  "Última: quais plataformas de streaming você usa? (Netflix, Prime, etc)"
];

const FEEDBACK = [
  "Legal! Adorei esses.",
  "Entendi, faz todo o sentido.",
  "Boa! Também curto.",
  "Valeu pelo toque, anotado.",
  "Perfeito!"
];

const OnboardingPage = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Seja bem-vindo ao CineMatch! ✨\n\nSou seu assistente pessoal de cinema. Pra eu te recomendar os filmes perfeitos, preciso conhecer um pouco do seu gosto.\n\n" + STEPS[0]
      }]);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      
      // Artificial delay for personality with feedback
      setTimeout(() => {
        setMessages(prev => [
          ...prev, 
          { role: "assistant", content: FEEDBACK[step] + " " + STEPS[nextStep] }
        ]);
        setStep(nextStep);
        setLoading(false);
      }, 800);
    } else {
      // Final step: process everything
      await finishOnboarding([...messages, userMsg]);
    }
  };

  const finishOnboarding = async (allMessages: any[]) => {
    if (!user) return;

    try {
      const chatHistory = allMessages
        .filter(m => m.role === "user")
        .map(m => m.content)
        .join("\n");

      // Save to taste_bio
      const { error } = await supabase
        .from("profiles")
        .update({ 
          taste_bio: chatHistory
        } as any)
        .eq("user_id", user.id);

      if (error) throw error;

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Perfeito! Já entendi tudo. Estou preparando sua home personalizada agora mesmo... 🎬✨" 
      }]);
      
      // Refresh profile state globally before navigating
      if (refreshProfile) await refreshProfile();
      
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erro ao salvar perfil" });
    } finally {
      setLoading(false);
    }
  };

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
        <button onClick={signOut} className="text-xs text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors">
          <LogOut size={14} /> Sair
        </button>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full flex flex-col min-h-0 bg-transparent">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1 scrollbar-hide">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user" 
                    ? "gradient-primary text-primary-foreground rounded-br-none shadow-lg" 
                    : "glass text-foreground/90 rounded-bl-none"
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 p-2 px-4 glass rounded-2xl w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
            </motion.div>
          )}
        </div>

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
          <div className="mt-4 flex justify-center gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= step ? "w-4 bg-primary" : "w-1 bg-muted/30"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
