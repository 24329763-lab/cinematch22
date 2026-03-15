import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import MovieCard, { type MovieResult } from "@/components/MovieCard";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  movies?: MovieResult[];
};

const MOCK_MOVIES: MovieResult[] = [
  {
    id: "1",
    title: "O Homem das Multidões",
    originalTitle: "The Man of the Crowd",
    year: 2013,
    rating: 7.2,
    ageRating: "14+",
    runtime: "1h 35min",
    genres: ["Drama", "Suspense", "Experimental"],
    aiInsight:
      "Um retrato hipnótico de Belo Horizonte à noite. Dois trabalhadores do metrô vivem em mundos paralelos. Baseado no conto de Edgar Allan Poe, é considerado pelo r/filmes como 'o filme brasileiro mais subestimado da década.'",
    socialProof: "94% de aprovação no r/filmes",
    platforms: ["prime"],
    director: "Marcelo Gomes, Cao Guimarães",
  },
  {
    id: "2",
    title: "O Som ao Redor",
    originalTitle: "Neighboring Sounds",
    year: 2012,
    rating: 7.3,
    ageRating: "16+",
    runtime: "2h 11min",
    genres: ["Drama", "Suspense", "Social"],
    aiInsight:
      "Kleber Mendonça Filho cria um suspense sociológico sobre uma rua de classe média no Recife. Os sons — alarmes, latidos, sussurros — constroem uma tensão que o Reddit compara ao 'Hereditário brasileiro.'",
    socialProof: "Mencionado 340+ vezes no r/cinema como must-watch",
    platforms: ["netflix", "prime"],
    director: "Kleber Mendonça Filho",
  },
  {
    id: "3",
    title: "As Boas Maneiras",
    originalTitle: "Good Manners",
    year: 2017,
    rating: 7.0,
    ageRating: "16+",
    runtime: "2h 15min",
    genres: ["Terror", "Fantasia", "Drama"],
    aiInsight:
      "Um conto de fadas sombrio em São Paulo. Uma babá descobre que sua patroa esconde um segredo sobrenatural. O X/Twitter brasileiro elegeu como 'o filme de terror mais original do Brasil.'",
    socialProof: "Trending no X com #CinemaBR em 2023",
    platforms: ["disney"],
    director: "Juliana Rojas, Marco Dutra",
  },
];

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

    // Simulate AI response
    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Encontrei 3 filmes que combinam com "${messageText}". Todos disponíveis agora nas suas plataformas:`,
        movies: MOCK_MOVIES,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
    }, 1500);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
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
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 mx-auto cinema-glow">
                  <Sparkles className="text-primary" size={24} />
                </div>
                <h1 className="text-2xl font-bold tracking-display mb-2">
                  O que vamos assistir?
                </h1>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Me diga o clima, o gênero ou até um sentimento. Eu encontro o filme certo nas suas plataformas.
                </p>
              </motion.div>

              {/* Suggestions */}
              <div className="mt-8 flex flex-col gap-2 w-full max-w-sm">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
                    onClick={() => handleSend(s)}
                    className="text-left text-sm px-4 py-3 rounded-xl bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors"
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
                  transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-primary/10 text-foreground px-4 py-2.5 rounded-2xl rounded-br-lg max-w-[85%] text-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {msg.content}
                      </p>
                      {msg.movies?.map((movie, i) => (
                        <MovieCard key={movie.id} movie={movie} index={i} />
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow [animation-delay:0.4s]" />
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
          <div className="flex items-center gap-2 glass-surface rounded-xl px-4 py-2 focus-within:ring-1 focus-within:ring-primary/50 transition-shadow">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Descreva o que quer assistir..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 transition-opacity hover:opacity-90"
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
