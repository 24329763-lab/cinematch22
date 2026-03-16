import { motion } from "framer-motion";
import { Star, Plus, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
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

const MovieRecommendationCard = ({ movie, index = 0 }: { movie: MovieRec; index?: number }) => {
  const [added, setAdded] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const slug = slugify(movie.title);
  const posterUrl = MOVIE_POSTERS[slug] || "/placeholder.svg";

  const addToWatchlist = async () => {
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

  const shareMovie = () => {
    const url = `${window.location.origin}/movie/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-surface rounded-2xl overflow-hidden flex gap-0 max-w-md"
    >
      {/* Poster */}
      <div className="w-28 h-40 flex-shrink-0">
        <img src={posterUrl} alt={movie.title} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-1">{movie.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            {movie.rating && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-cinema-gold">
                <Star size={10} className="fill-current" /> {movie.rating}
              </span>
            )}
            {movie.year && <span className="text-xs text-muted-foreground">{movie.year}</span>}
          </div>
          {movie.platforms && movie.platforms.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {movie.platforms.map((p) => (
                <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded glass text-foreground/70">{p}</span>
              ))}
            </div>
          )}
          {movie.reason && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{movie.reason}</p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={addToWatchlist}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all ${added ? "gradient-primary text-primary-foreground" : "glass text-foreground/70 hover:bg-white/10"}`}
          >
            {added ? <Check size={12} /> : <Plus size={12} />}
            {added ? "Salvo" : "Lista"}
          </button>
          <button onClick={shareMovie} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl glass text-foreground/70 hover:bg-white/10">
            <ExternalLink size={12} /> Link
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MovieRecommendationCard;

// Parse AI response for movie recommendations
export function parseMovieRecommendations(content: string): MovieRec[] {
  const movies: MovieRec[] = [];
  // Match patterns like **Title (Year)** or **🎬 Title (Year)**
  const regex = /\*\*[🎬🎥🎞️]*\s*(.+?)\s*(?:\((\d{4})\))?\s*\*\*/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const title = match[1].replace(/[🎬🎥🎞️]/g, "").trim();
    const year = match[2] ? parseInt(match[2]) : undefined;
    // Try to extract rating
    const afterMatch = content.slice(match.index, match.index + 300);
    const ratingMatch = afterMatch.match(/⭐\s*([\d.]+)|IMDb[:\s]*([\d.]+)|nota[:\s]*([\d.]+)/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1] || ratingMatch[2] || ratingMatch[3] || "0") : undefined;
    // Extract platforms
    const platforms: string[] = [];
    if (/netflix/i.test(afterMatch)) platforms.push("Netflix");
    if (/prime/i.test(afterMatch)) platforms.push("Prime");
    if (/disney/i.test(afterMatch)) platforms.push("Disney+");
    // Extract reason - text after the title line
    const reasonMatch = afterMatch.match(/(?:\n|—|:)\s*(.{20,150}?)(?:\n|$)/);
    const reason = reasonMatch ? reasonMatch[1].replace(/\*\*/g, "").trim() : undefined;

    if (title.length > 1 && title.length < 80) {
      movies.push({ title, year, rating, platforms, reason });
    }
  }
  return movies;
}
