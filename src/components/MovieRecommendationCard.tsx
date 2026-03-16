import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Plus, Check, ExternalLink, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MOVIE_POSTERS } from "@/lib/tmdb";

export interface MovieRec {
  title: string;
  year?: number;
  rating?: number;
  platforms?: string[];
  genres?: string[];
  reason?: string;
  description?: string;
}

const slugify = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Cache TMDB poster lookups
const posterCache: Record<string, string> = {};

const MovieRecommendationCard = ({ movie, index = 0 }: { movie: MovieRec; index?: number }) => {
  const [added, setAdded] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string>("/placeholder.svg");
  const [tmdbDescription, setTmdbDescription] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const slug = slugify(movie.title);

  // Check local posters first, then fetch from TMDB
  useEffect(() => {
    const localPoster = MOVIE_POSTERS[slug];
    if (localPoster) {
      setPosterUrl(localPoster);
      return;
    }
    if (posterCache[slug]) {
      setPosterUrl(posterCache[slug]);
      return;
    }

    // Fetch from TMDB
    const fetchPoster = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("tmdb-posters", {
          body: { titles: [movie.title] },
        });
        if (!error && data?.results?.[0]?.posterUrl) {
          const url = data.results[0].posterUrl;
          posterCache[slug] = url;
          setPosterUrl(url);
          if (data.results[0].overview && !movie.reason) {
            setTmdbDescription(data.results[0].overview);
          }
        }
      } catch {
        // Silently fail, keep placeholder
      }
    };
    fetchPoster();
  }, [movie.title, slug, movie.reason]);

  const addToWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ variant: "destructive", title: "Faça login para salvar" });
      return;
    }
    const { error } = await supabase.from("watchlist").upsert({
      user_id: user.id,
      movie_id: slug,
      title: movie.title,
      poster_url: posterUrl,
      year: movie.year,
      rating: movie.rating,
      platforms: movie.platforms || [],
      genres: movie.genres || [],
    }, { onConflict: "user_id,movie_id" });
    if (!error) {
      setAdded(true);
      toast({ title: "Adicionado à sua lista!" });
    }
  };

  const shareMovie = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/movie/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  const displayDescription = movie.reason || tmdbDescription || movie.description;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08 }}
      className="flex-shrink-0 w-[180px] sm:w-[200px] flex flex-col gap-2"
    >
      {/* Poster */}
      <div
        className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer group/rec"
        style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
      >
        <img src={posterUrl} alt={movie.title} className="w-full h-full object-cover transition-transform duration-500 group-hover/rec:scale-110" />

        {movie.platforms && movie.platforms.length > 0 && (
          <div className="absolute top-2 right-2 flex gap-1">
            {movie.platforms.map((p) => (
              <span key={p} className="bg-background/80 text-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                {p}
              </span>
            ))}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h4 className="text-sm font-bold leading-tight line-clamp-2 text-foreground drop-shadow-lg">
            {movie.title}
          </h4>
          <div className="flex items-center gap-1.5 mt-1">
            {movie.year && <span className="text-[11px] text-foreground/60 tabular-nums">{movie.year}</span>}
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover/rec:opacity-100 transition-opacity duration-300">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center cinema-glow-sm">
            <Play size={16} className="text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
          <div className="flex gap-2">
            <button onClick={addToWatchlist} className="p-1.5 rounded-full glass text-foreground hover:bg-white/20 transition-all">
              {added ? <Check size={12} /> : <Plus size={12} />}
            </button>
            <button onClick={shareMovie} className="p-1.5 rounded-full glass text-foreground hover:bg-white/20 transition-all">
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Description underneath */}
      {displayDescription && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 px-1">
          {displayDescription}
        </p>
      )}
    </motion.div>
  );
};

export default MovieRecommendationCard;

export function parseMovieRecommendations(content: string): MovieRec[] {
  const movies: MovieRec[] = [];
  // Match **Title** or **Title (Year)** with optional emojis
  const regex = /\*\*[🎬🎥🎞️]*\s*(.+?)\s*(?:\((\d{4})\))?\s*\*\*/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const title = match[1].replace(/[🎬🎥🎞️]/g, "").trim();
    const year = match[2] ? parseInt(match[2]) : undefined;
    const afterMatch = content.slice(match.index, match.index + 500);
    
    // Extract platforms
    const platforms: string[] = [];
    if (/netflix/i.test(afterMatch)) platforms.push("Netflix");
    if (/prime/i.test(afterMatch)) platforms.push("Prime");
    if (/disney/i.test(afterMatch)) platforms.push("Disney+");

    // Extract reason/description
    const reasonMatch = afterMatch.match(/\*\*[\s\S]*?\n+(.{20,250}?)(?:\n\n|\n-|\n\*|$)/);
    const reason = reasonMatch ? reasonMatch[1].replace(/\*\*/g, "").replace(/^[\s\-:]+/, "").trim() : undefined;

    if (title.length > 1 && title.length < 80) {
      movies.push({ title, year, platforms, reason });
    }
  }
  return movies;
}
