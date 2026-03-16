import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, Trash2, Eye, ChevronLeft, ChevronRight, Sparkles, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MovieDetailModal from "@/components/MovieDetailModal";
import type { MoviePoster } from "@/lib/tmdb";

// Mood-aware genre labels
const GENRE_LABELS: Record<string, { title: string; subtitle?: string }> = {
  "terror": { title: "Pra sentir aquele frio na espinha", subtitle: "Terror & Suspense" },
  "horror": { title: "Pra sentir aquele frio na espinha", subtitle: "Terror & Suspense" },
  "comédia": { title: "Pra dar risada sem parar", subtitle: "Comédia" },
  "comedy": { title: "Pra dar risada sem parar", subtitle: "Comédia" },
  "drama": { title: "Pra se emocionar de verdade", subtitle: "Drama" },
  "romance": { title: "Pra um dia de romance", subtitle: "Romance" },
  "ação": { title: "Adrenalina pura", subtitle: "Ação & Aventura" },
  "action": { title: "Adrenalina pura", subtitle: "Ação & Aventura" },
  "ficção científica": { title: "Viagens além da imaginação", subtitle: "Ficção Científica" },
  "sci-fi": { title: "Viagens além da imaginação", subtitle: "Ficção Científica" },
  "science fiction": { title: "Viagens além da imaginação", subtitle: "Ficção Científica" },
  "animação": { title: "Pra assistir com a família", subtitle: "Animação" },
  "animation": { title: "Pra assistir com a família", subtitle: "Animação" },
  "documentário": { title: "Histórias reais que inspiram", subtitle: "Documentário" },
  "documentary": { title: "Histórias reais que inspiram", subtitle: "Documentário" },
  "thriller": { title: "Tensão do início ao fim", subtitle: "Thriller" },
  "suspense": { title: "Tensão do início ao fim", subtitle: "Suspense" },
  "fantasia": { title: "Mundos mágicos te esperam", subtitle: "Fantasia" },
  "fantasy": { title: "Mundos mágicos te esperam", subtitle: "Fantasia" },
  "aventura": { title: "Jornadas épicas", subtitle: "Aventura" },
  "adventure": { title: "Jornadas épicas", subtitle: "Aventura" },
  "crime": { title: "Mistérios e crimes", subtitle: "Crime" },
  "guerra": { title: "Histórias de guerra", subtitle: "Guerra" },
  "war": { title: "Histórias de guerra", subtitle: "Guerra" },
  "musical": { title: "Pra cantar junto", subtitle: "Musical" },
  "western": { title: "No velho oeste", subtitle: "Western" },
};

function getGenreLabel(genre: string): { title: string; subtitle?: string } {
  const key = genre.toLowerCase().trim();
  return GENRE_LABELS[key] || { title: genre, subtitle: undefined };
}

const GenreCarousel = ({
  genre,
  items,
  onRemove,
  onMarkWatched,
  onSelectMovie,
}: {
  genre: string;
  items: any[];
  onRemove: (id: string) => void;
  onMarkWatched: (item: any) => void;
  onSelectMovie: (movie: MoviePoster) => void;
}) => {
  const scrollRef = useState<HTMLDivElement | null>(null);
  const label = getGenreLabel(genre);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef[0];
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -260 : 260, behavior: "smooth" });
  };

  return (
    <div className="mb-8">
      <div className="px-1 mb-3">
        <h2 className="text-base font-bold text-foreground">{label.title}</h2>
        {label.subtitle && <span className="text-[11px] text-muted-foreground">{label.subtitle}</span>}
      </div>

      <div className="relative group/scroll">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-background/90 to-transparent flex items-center justify-start opacity-0 group-hover/scroll:opacity-100 transition-opacity"
        >
          <ChevronLeft size={16} className="text-foreground" />
        </button>

        <div
          ref={(el) => { (scrollRef as any)[0] = el; }}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-1 pb-2"
        >
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex-shrink-0 w-[140px]"
            >
              <div
                className="relative cursor-pointer group/card"
                onClick={() =>
                  onSelectMovie({
                    id: item.movie_id,
                    title: item.title,
                    year: item.year || 2024,
                    rating: item.rating || 7.5,
                    posterUrl: item.poster_url || "/placeholder.svg",
                    platforms: (item.platforms || []) as ("netflix" | "prime" | "disney")[],
                    genres: item.genres || [],
                    description: "",
                  })
                }
              >
                <img
                  src={item.poster_url || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full h-[210px] object-cover rounded-xl"
                  loading="lazy"
                />
                {/* Overlay actions on hover */}
                <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarkWatched(item); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl glass text-foreground hover:bg-white/20 transition-colors"
                  >
                    <Eye size={12} /> Assistido
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl glass text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 size={12} /> Remover
                  </button>
                </div>
              </div>
              <div className="mt-1.5 px-0.5">
                <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {item.rating && (
                    <span className="flex items-center gap-0.5 text-[10px] text-cinema-gold">
                      <Star size={8} className="fill-current" /> {item.rating}
                    </span>
                  )}
                  {item.year && <span className="text-[10px] text-muted-foreground">{item.year}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-background/90 to-transparent flex items-center justify-end opacity-0 group-hover/scroll:opacity-100 transition-opacity"
        >
          <ChevronRight size={16} className="text-foreground" />
        </button>
      </div>
    </div>
  );
};

const WatchlistPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<MoviePoster | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false })
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, [user]);

  const removeItem = async (id: string) => {
    await supabase.from("watchlist").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Removido da lista" });
  };

  const markWatched = async (item: any) => {
    await supabase.from("watched").upsert({
      user_id: user!.id,
      movie_id: item.movie_id,
      title: item.title,
      poster_url: item.poster_url,
      year: item.year,
      platforms: item.platforms,
      genres: item.genres,
    }, { onConflict: "user_id,movie_id" });
    await supabase.from("watchlist").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: "Movido para Assistidos!" });
  };

  // Group items by genre (first genre of each item)
  const genreGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const uncategorized: any[] = [];

    for (const item of items) {
      const genres = item.genres as string[] | null;
      if (!genres || genres.length === 0) {
        uncategorized.push(item);
        continue;
      }
      // Add to primary genre
      const primary = genres[0];
      if (!groups[primary]) groups[primary] = [];
      groups[primary].push(item);
    }

    // Sort genres by number of items (descending)
    const sorted = Object.entries(groups)
      .sort(([, a], [, b]) => b.length - a.length);

    // Add uncategorized at the end if any
    if (uncategorized.length > 0) {
      sorted.push(["Outros", uncategorized]);
    }

    return sorted;
  }, [items]);

  if (!user) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Faça login para ver sua lista</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] px-4 pt-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2.5 mb-6">
          <Heart size={20} className="text-primary" />
          <h1 className="text-2xl font-black tracking-display">Minha Lista</h1>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">{items.length} títulos</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 shimmer rounded-2xl" />)}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 cinema-glow-sm">
              <MessageCircle size={22} className="text-primary-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Sua lista está vazia</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6 leading-relaxed">
              Peça recomendações no chat e adicione filmes à sua lista para organizar o que assistir.
            </p>
            <button
              onClick={() => navigate("/chat")}
              className="gradient-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-bold cinema-glow-sm hover:opacity-90 transition-opacity"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} /> Pedir recomendações
              </span>
            </button>
          </motion.div>
        ) : (
          genreGroups.map(([genre, groupItems]) => (
            <GenreCarousel
              key={genre}
              genre={genre}
              items={groupItems}
              onRemove={removeItem}
              onMarkWatched={markWatched}
              onSelectMovie={setSelectedMovie}
            />
          ))
        )}
      </div>

      {selectedMovie && (
        <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
};

export default WatchlistPage;
