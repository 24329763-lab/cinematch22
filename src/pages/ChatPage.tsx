import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Menu, ThumbsUp, ThumbsDown, Share2, ChevronLeft, ChevronRight, MessageCircle, Film } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { streamChat } from "@/lib/chat-stream";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ChatSidebar, { type Conversation } from "@/components/ChatSidebar";
import MovieRecommendationCard, { parseMovieRecommendations, type MovieRec } from "@/components/MovieRecommendationCard";
import MovieDetailModal from "@/components/MovieDetailModal";
import type { MoviePoster } from "@/lib/tmdb";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  liked?: boolean | null;
  dbId?: string;
};

const SUGGESTIONS = [
  { text: "Um terror psicológico que não seja óbvio", icon: Film },
  { text: "Algo leve pra assistir com a família", icon: Film },
  { text: "Quero conversar sobre meu gosto em filmes", icon: MessageCircle },
  { text: "Me ajuda a entender que tipo de filme eu curto", icon: MessageCircle },
];

function movieRecToMoviePoster(movie: MovieRec, posterUrl: string): MoviePoster {
  return {
    id: movie.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: movie.title,
    year: movie.year || 2024,
    rating: movie.rating || 7.5,
    posterUrl,
    platforms: (movie.platforms || []).map((p) => {
      const key = p.toLowerCase().replace(/\s+/g, "");
      if (key.includes("netflix")) return "netflix";
      if (key.includes("prime")) return "prime";
      if (key.includes("disney")) return "disney";
      return "netflix" as const;
    }) as ("netflix" | "prime" | "disney")[],
    genres: movie.genres || [],
    description: movie.reason || movie.description,
  };
}

const ChatMovieScroll = ({ movies, onOpenDetail }: { movies: MovieRec[]; onOpenDetail: (movie: MovieRec, posterUrl: string) => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };

  return (
    <div className="relative group/chatscroll -mx-4">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-background/90 to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/chatscroll:opacity-100 transition-opacity"
      >
        <div className="w-7 h-7 rounded-full glass flex items-center justify-center">
          <ChevronLeft size={14} className="text-foreground" />
        </div>
      </button>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide px-4 py-2 scroll-smooth">
        {movies.map((movie, i) => (
          <MovieRecommendationCard key={movie.title + i} movie={movie} index={i} onOpenDetail={onOpenDetail} />
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-background/90 to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/chatscroll:opacity-100 transition-opacity"
      >
        <div className="w-7 h-7 rounded-full glass flex items-center justify-center">
          <ChevronRight size={14} className="text-foreground" />
        </div>
      </button>
    </div>
  );
};

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvIdRaw] = useState<string | null>(() => {
    return sessionStorage.getItem("activeConvId") || null;
  });
  const setActiveConvId = (id: string | null) => {
    setActiveConvIdRaw(id);
    if (id) sessionStorage.setItem("activeConvId", id);
    else sessionStorage.removeItem("activeConvId");
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MoviePoster | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    supabase.from("conversations").select("*").order("updated_at", { ascending: false })
      .then(({ data }) => { if (data) setConversations(data as Conversation[]); });
  }, [user]);

  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    supabase.from("chat_messages").select("*").eq("conversation_id", activeConvId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content, liked: m.liked, dbId: m.id })));
      });
  }, [activeConvId]);

  const createConversation = async (title: string): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase.from("conversations").insert({ user_id: user.id, title }).select("id").single();
    if (error || !data) return null;
    setConversations((prev) => [{ id: data.id, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev]);
    return data.id;
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    const { data } = await supabase.from("chat_messages").insert({ conversation_id: convId, role, content }).select("id").single();
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    return data?.id;
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let convId = activeConvId;
    if (!convId && user) {
      convId = await createConversation(messageText.length > 40 ? messageText.slice(0, 40) + "..." : messageText);
      setActiveConvId(convId);
    }
    if (convId) await saveMessage(convId, "user", messageText);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === "streaming") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { id: "streaming", role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        onDelta: upsertAssistant,
        onDone: async () => {
          let dbId: string | undefined;
          if (convId) dbId = await saveMessage(convId, "assistant", assistantSoFar);
          setMessages((prev) => prev.map((m) => m.id === "streaming" ? { ...m, id: Date.now().toString(), dbId } : m));
          setIsLoading(false);
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

  const toggleLike = async (msg: Message, liked: boolean) => {
    if (!msg.dbId) return;
    const newLiked = msg.liked === liked ? null : liked;
    await supabase.from("chat_messages").update({ liked: newLiked }).eq("id", msg.dbId);
    setMessages((prev) => prev.map((m) => m.dbId === msg.dbId ? { ...m, liked: newLiked } : m));
  };

  const shareMessage = (msg: Message) => {
    navigator.clipboard.writeText(msg.content);
    toast({ title: "Mensagem copiada!" });
  };

  const handleNewConversation = () => { setActiveConvId(null); setMessages([]); };

  const handleDeleteConversation = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) handleNewConversation();
  };

  const handleOpenMovieDetail = (movie: MovieRec, posterUrl: string) => {
    setSelectedMovie(movieRecToMoviePoster(movie, posterUrl));
  };

  const renderAssistantMessage = (msg: Message) => {
    const movieRecs = msg.id !== "streaming" ? parseMovieRecommendations(msg.content) : [];

    const lines = msg.content.split("\n").filter(l => l.trim());
    const lastLine = lines[lines.length - 1]?.trim() || "";
    const hasFollowUp = movieRecs.length > 0 && lastLine.includes("?") && !lastLine.startsWith("**");

    return (
      <div className="space-y-3">
        {movieRecs.length > 0 ? (
          <>
            {(() => {
              const firstBold = msg.content.search(/\*\*[^*]+\*\*/);
              const intro = firstBold > 0 ? msg.content.slice(0, firstBold).trim() : "";
              return intro ? (
                <div className="glass rounded-2xl p-4 max-w-[90%]">
                  <div className="prose prose-sm prose-invert max-w-none text-foreground/90 [&_strong]:text-foreground [&_p]:leading-relaxed">
                    <ReactMarkdown>{intro}</ReactMarkdown>
                  </div>
                </div>
              ) : null;
            })()}

            <ChatMovieScroll movies={movieRecs} onOpenDetail={handleOpenMovieDetail} />

            {hasFollowUp && (
              <div className="glass rounded-2xl p-4 max-w-[90%]">
                <p className="text-sm text-foreground/90 leading-relaxed">{lastLine}</p>
              </div>
            )}
          </>
        ) : (
          <div className="glass rounded-2xl p-4 max-w-[90%]">
            <div className="prose prose-sm prose-invert max-w-none text-foreground/90 [&_strong]:text-foreground [&_p]:leading-relaxed [&_li]:text-sm [&_ul]:space-y-1">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        )}

        {msg.id !== "streaming" && (
          <div className="flex items-center gap-1.5 pl-1">
            <button onClick={() => toggleLike(msg, true)} className={`p-1.5 rounded-lg transition-all ${msg.liked === true ? "text-cinema-gold" : "text-muted-foreground hover:text-foreground"}`}>
              <ThumbsUp size={14} />
            </button>
            <button onClick={() => toggleLike(msg, false)} className={`p-1.5 rounded-lg transition-all ${msg.liked === false ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}>
              <ThumbsDown size={14} />
            </button>
            <button onClick={() => shareMessage(msg)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <Share2 size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-4rem)]">
      <ChatSidebar conversations={conversations} activeId={activeConvId} onSelect={setActiveConvId} onNew={handleNewConversation} onDelete={handleDeleteConversation} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground">
            <Menu size={18} />
          </button>
          <span className="text-sm font-semibold text-foreground truncate">
            {activeConvId ? conversations.find((c) => c.id === activeConvId)?.title || "Conversa" : "Nova conversa"}
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
          <AnimatePresence mode="wait">
            {isEmpty ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center px-4">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
                  <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 mx-auto cinema-glow animate-float">
                    <Sparkles className="text-primary-foreground" size={28} />
                  </div>
                  <h2 className="text-3xl font-black tracking-display mb-3">
                    <span className="gradient-text">O que vamos assistir?</span>
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Peça recomendações ou me conte o que você curte — vou aprender seu gosto.
                  </p>
                </motion.div>
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button key={s.text} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }} onClick={() => handleSend(s.text)} className="text-left text-sm px-4 py-3.5 rounded-2xl glass text-foreground/80 hover:bg-white/10 transition-all hover:scale-[1.02] flex items-center gap-2">
                      <s.icon size={14} className="text-primary flex-shrink-0" />
                      {s.text}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="py-4 space-y-4 max-w-2xl mx-auto">
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] text-sm shadow-lg">
                          {msg.content}
                        </div>
                      </div>
                    ) : renderAssistantMessage(msg)}
                  </motion.div>
                ))}

                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5 text-sm text-muted-foreground glass rounded-2xl px-4 py-3 w-fit">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full gradient-primary animate-pulse-glow" />
                      <span className="w-2 h-2 rounded-full gradient-primary animate-pulse-glow [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full gradient-primary animate-pulse-glow [animation-delay:0.4s]" />
                    </div>
                    Pensando...
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 pb-safe">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 glass-surface rounded-2xl px-4 py-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Peça filmes ou conte seu gosto..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2.5" />
              <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="p-2.5 rounded-xl gradient-primary text-primary-foreground disabled:opacity-30 transition-all hover:opacity-90 cinema-glow-sm">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedMovie && (
        <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
};

export default ChatPage;
