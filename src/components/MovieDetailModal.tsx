import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Play, Plus, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { MoviePoster } from "@/lib/tmdb";

const slugify = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const platformLabels: Record<string, string> = {
  netflix: "Netflix",
  prime: "Prime Video",
  disney: "Disney+",
};

interface MovieDetailModalProps {
  movie: MoviePoster | null;
  onClose: () => void;
}

const MovieDetailModal = ({ movie, onClose }: MovieDetailModalProps) => {
  const [added, setAdded] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  if (!movie) return null;

  const slug = slugify(movie.title);

  const addToWatchlist = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Faça login para salvar" });
      return;
    }
    const { error } = await supabase.from("watchlist").upsert({
      user_id: user.id,
      movie_id: slug,
      title: movie.title,
      poster_url: movie.posterUrl,
      year: movie.year,
      rating: movie.rating,
      platforms: movie.platforms,
      genres: movie.genres,
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

  // Simple taste-based reason (could be enhanced with AI later)
  const getWhyYouLike = () => {
    if (!user) return null;
    const genreReasons: Record<string, string> = {
      "Drama": "Dramas intensos combinam com o seu perfil.",
      "Suspense": "Você curte histórias com tensão e reviravoltas.",
      "Ação": "Perfeito pro seu gosto por adrenalina.",
      "Crime": "Histórias de crime sempre te prendem.",
      "Comédia": "Uma boa risada nunca falha com você.",
      "Terror": "Você gosta de sentir aquele frio na espinha.",
      "Ficção Científica": "Ficção científica é a sua praia.",
      "Histórico": "Histórias reais que marcaram época.",
      "Biografia": "Vidas extraordinárias te inspiram.",
    };
    for (const g of movie.genres) {
      if (genreReasons[g]) return genreReasons[g];
    }
    return null;
  };

  const whyReason = getWhyYouLike();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden glass-surface-strong z-10"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full glass flex items-center justify-center text-foreground hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col sm:flex-row">
            {/* Poster */}
            <div className="sm:w-[280px] flex-shrink-0">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full h-[300px] sm:h-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-display text-foreground mb-2">
                  {movie.title}
                </h2>

                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="flex items-center gap-1 text-sm font-bold text-cinema-gold tabular-nums">
                    <Star size={14} className="fill-current" /> {movie.rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">{movie.year}</span>
                  {movie.genres.map((g) => (
                    <span key={g} className="text-xs px-2.5 py-1 rounded-full glass text-foreground/80">{g}</span>
                  ))}
                </div>

                {/* Platforms */}
                <div className="flex gap-2 mb-5">
                  {movie.platforms.map((p) => (
                    <span key={p} className="text-xs font-semibold px-3 py-1 rounded-lg glass text-foreground/70">
                      {platformLabels[p] || p}
                    </span>
                  ))}
                </div>

                {/* Description */}
                {movie.description && (
                  <p className="text-sm text-foreground/70 leading-relaxed mb-4">
                    {movie.description}
                  </p>
                )}

                {/* Match percent */}
                {movie.matchPercent && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="gradient-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      {movie.matchPercent}% match
                    </span>
                  </div>
                )}

                {/* Why you'd like it */}
                {whyReason && (
                  <p className="text-sm italic text-primary/80 mb-4">
                    💡 {whyReason}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button className="flex items-center gap-2 gradient-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity cinema-glow-sm">
                  <Play size={16} fill="currentColor" /> Assistir
                </button>
                <button
                  onClick={addToWatchlist}
                  className="flex items-center gap-2 glass text-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  {added ? <Check size={16} /> : <Plus size={16} />}
                  {added ? "Na Lista" : "Minha Lista"}
                </button>
                <button
                  onClick={shareMovie}
                  className="flex items-center gap-2 glass text-foreground px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MovieDetailModal;
