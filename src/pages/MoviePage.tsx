import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Play, Plus, Check, ArrowLeft, Share2, Loader2 } from "lucide-react";
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

const MoviePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [added, setAdded] = useState(false);
  const [movie, setMovie] = useState<MoviePoster | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMovie() {
      if (!slug) return;
      setLoading(true);
      try {
        const query = slug.replace(/-/g, " ");
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tmdb_proxy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            url: `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}`,
          }),
        });

        if (!resp.ok) throw new Error("Failed to fetch movie details");
        const data = await resp.json();

        const tmdbMovie = data.results && data.results.length > 0 ? data.results[0] : null;

        if (tmdbMovie) {
          if (user) {
            const { data: watchData } = await supabase
              .from("watchlist")
              .select("id")
              .eq("user_id", user.id)
              .eq("movie_id", slugify(tmdbMovie.title))
              .maybeSingle();
            if (watchData) setAdded(true);
          }

          setMovie({
            id: slugify(tmdbMovie.title),
            title: tmdbMovie.title,
            year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.slice(0, 4)) : 2024,
            rating: tmdbMovie.vote_average ? parseFloat(tmdbMovie.vote_average.toFixed(1)) : 0,
            posterUrl: tmdbMovie.poster_path
              ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
              : "/placeholder.svg",
            backdropUrl: tmdbMovie.backdrop_path
              ? `https://image.tmdb.org/t/p/w1280${tmdbMovie.backdrop_path}`
              : undefined,
            platforms: ["netflix"],
            genres: [],
            description: tmdbMovie.overview,
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchMovie();
  }, [slug, user]);

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Filme não encontrado</p>
          <button onClick={() => navigate("/")} className="text-primary font-semibold">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const addToWatchlist = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Faça login para salvar" });
      return;
    }
    const { error } = await supabase.from("watchlist").upsert(
      {
        user_id: user.id,
        movie_id: movie.id,
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

  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copiado!" });
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="relative h-[350px]">
          <img src={movie.backdropUrl || movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 p-2.5 rounded-full glass text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <button onClick={share} className="absolute top-4 right-4 p-2.5 rounded-full glass text-foreground">
            <Share2 size={18} />
          </button>
        </div>

        <div className="px-5 -mt-20 relative z-10 max-w-2xl mx-auto">
          <div className="flex gap-5">
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-32 h-48 rounded-2xl object-cover shadow-2xl flex-shrink-0 bg-secondary"
            />
            <div className="pt-12">
              <h1 className="text-2xl font-black tracking-display">{movie.title}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="flex items-center gap-1 text-sm font-bold text-cinema-gold">
                  <Star size={14} className="fill-current" /> {movie.rating}
                </span>
                <span className="text-sm text-muted-foreground">{movie.year}</span>
                {movie.genres &&
                  movie.genres.map((g) => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full glass text-foreground/80">
                      {g}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {movie.description && <p className="text-sm text-foreground/70 leading-relaxed mt-5">{movie.description}</p>}

          <div className="flex gap-3 mt-6">
            <button className="flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-bold cinema-glow">
              <Play size={16} fill="currentColor" /> Assistir
            </button>
            <button
              onClick={addToWatchlist}
              className="flex items-center gap-2 glass text-foreground px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/10"
            >
              {added ? <Check size={16} /> : <Plus size={16} />}
              {added ? "Na Lista" : "Minha Lista"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MoviePage;
