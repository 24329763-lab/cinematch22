import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Play, Plus, Check, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { MoviePoster } from "@/lib/tmdb";

const slugify = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const platformLabels: Record<string, string> = {
  netflix: "Netflix",
  prime: "Prime Video",
  disney: "Disney+",
};

const platformLinks: Record<string, (title: string) => string> = {
  netflix: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  prime: (title) => `https://www.primevideo.com/search?keyword=${encodeURIComponent(title)}`,
  disney: (title) => `https://www.disneyplus.com/search?q=${encodeURIComponent(title)}`,
};

interface MovieDetailModalProps {
  movie: MoviePoster | null;
  onClose: () => void;
}

const MovieDetailModal = ({ movie, onClose }: MovieDetailModalProps) => {
  const [added, setAdded] = useState(false);
  const [showWatchOptions, setShowWatchOptions] = useState(false);
  const [watchProviders, setWatchProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  if (!movie) return null;

  const slug = slugify(movie.title);

  useEffect(() => {
    if (movie?.tmdbId && showWatchOptions) {
      fetchWatchProviders();
    }
  }, [showWatchOptions, movie?.tmdbId]);

  const fetchWatchProviders = async () => {
    if (!movie?.tmdbId) return;

    setLoadingProviders(true);
    try {
      const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

      // If no API key, use the platforms already on the movie object
      if (!TMDB_API_KEY) {
        const providers = movie.platforms.map((p) => ({
          provider_name: platformLabels[p] || p,
          platform: p,
          link: platformLinks[p] ? platformLinks[p](movie.title) : "#",
        }));
        setWatchProviders(providers);
        return;
      }

      const url = `https://api.themoviedb.org/3/movie/${movie.tmdbId}/watch/providers?api_key=${TMDB_API_KEY}&region=BR`;
      const resp = await fetch(url);
      const data = await resp.json();

      const brProviders = data.results?.BR;
      const providers = [];

      const providerMap: Record<number, { name: string; platform: string }> = {
        8: { name: "Netflix", platform: "netflix" },
        119: { name: "Prime Video", platform: "prime" },
        37: { name: "Disney+", platform: "disney" },
      };

      if (brProviders?.flatrate) {
        for (const p of brProviders.flatrate) {
          const mapped = providerMap[p.provider_id];
          if (mapped) {
            providers.push({
              provider_name: mapped.name,
              platform: mapped.platform,
              link: platformLinks[mapped.platform](movie.title),
            });
          }
        }
      }

      if (providers.length === 0) {
        const fallback = movie.platforms.map((p) => ({
          provider_name: platformLabels[p] || p,
          platform: p,
          link: platformLinks[p] ? platformLinks[p](movie.title) : "#",
        }));
        setWatchProviders(fallback);
      } else {
        setWatchProviders(providers);
      }
    } catch (e) {
      console.error("Error fetching watch providers:", e);
      const providers = movie.platforms.map((p) => ({
        provider_name: platformLabels[p] || p,
        platform: p,
        link: platformLinks[p] ? platformLinks[p](movie.title) : "#",
      }));
      setWatchProviders(providers);
    } finally {
      setLoadingProviders(false);
    }
  };

  const addToWatchlist = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Faça login para salvar" });
      return;
    }
    const { error } = await supabase.from("watchlist").upsert(
      {
        user_id: user.id,
        movie_id: slug,
        title: movie.title,
        poster_url: movie.posterUrl,
        year: movie.year,
        rating: movie.rating,
        platforms: movie.platforms,
        genres: movie.genres,
      },
      { onConflict: "user_id,movie_id" },
    );
    if (!error) {
      setAdded(true);
      toast({ title: "Adicionado à sua lista!" });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden glass-surface-strong z-10"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full glass flex items-center justify-center text-foreground hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-[280px] flex-shrink-0">
              <img src={movie.posterUrl} alt={movie.title} className="w-full h-[300px] sm:h-full object-cover" />
            </div>

            <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto max-h-[50vh] sm:max-h-[85vh]">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-display text-foreground mb-2">{movie.title}</h2>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="flex items-center gap-1 text-sm font-bold text-cinema-gold tabular-nums">
                    <Star size={14} className="fill-current" /> {movie.rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">{movie.year}</span>
                  {movie.genres.map((g) => (
                    <span key={g} className="text-xs px-2.5 py-1 rounded-full glass text-foreground/80">
                      {g}
                    </span>
                  ))}
                </div>
                {movie.description && (
                  <p className="text-sm text-foreground/70 leading-relaxed mb-4">{movie.description}</p>
                )}
              </div>

              <AnimatePresence>
                {showWatchOptions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-4 rounded-xl glass border border-white/10"
                  >
                    <h3 className="text-sm font-bold text-foreground mb-3">Onde assistir:</h3>
                    {loadingProviders ? (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Carregando...
                      </div>
                    ) : watchProviders.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {watchProviders.map((provider) => (
                          <a
                            key={provider.platform}
                            href={provider.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg glass hover:bg-white/10 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                              <Play size={14} className="text-primary-foreground fill-current" />
                            </div>
                            <p className="text-sm font-semibold text-foreground truncate flex-1">
                              {provider.provider_name}
                            </p>
                            <ExternalLink
                              size={14}
                              className="text-muted-foreground group-hover:text-foreground transition-colors"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Não disponível no momento.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 mt-4 flex-wrap">
                <button
                  onClick={() => setShowWatchOptions(!showWatchOptions)}
                  className="flex items-center gap-2 gradient-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity shadow-lg"
                >
                  <Play size={16} fill="currentColor" /> {showWatchOptions ? "Ocultar" : "Assistir"}
                </button>
                <button
                  onClick={addToWatchlist}
                  className="flex items-center gap-2 glass text-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  {added ? <Check size={16} /> : <Plus size={16} />} {added ? "Na Lista" : "Minha Lista"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MovieDetailModal;
