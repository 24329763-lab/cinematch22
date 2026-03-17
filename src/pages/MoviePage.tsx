import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Play, Plus, Check, ArrowLeft, Share2 } from "lucide-react";
import { useState } from "react";
import { TRENDING, FOR_YOU, LEAVING_SOON, NEW_RELEASES, NETFLIX_ORIGINALS, type MoviePoster } from "@/lib/tmdb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const ALL_MOVIES = [...TRENDING, ...FOR_YOU, ...LEAVING_SOON, ...NEW_RELEASES, ...NETFLIX_ORIGINALS];

const slugify = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const MoviePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [added, setAdded] = useState(false);

  const movie = ALL_MOVIES.find((m) => slugify(m.title) === slug);

  if (!movie) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Filme não encontrado</p>
          <button onClick={() => navigate("/")} className="text-primary font-semibold">Voltar</button>
        </div>
      </div>
    );
  }

  const addToWatchlist = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Faça login para salvar" });
      return;
    }
    const { error } = await supabase.from("watchlist").upsert({
      user_id: user.id,
      movie_id: slug!,
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

  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copiado!" });
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Backdrop */}
        <div className="relative h-[350px]">
          <img src={movie.backdropUrl || movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2.5 rounded-full glass text-foreground">
            <ArrowLeft size={18} />
          </button>
          <button onClick={share} className="absolute top-4 right-4 p-2.5 rounded-full glass text-foreground">
            <Share2 size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 -mt-20 relative z-10 max-w-2xl mx-auto">
          <div className="flex gap-5">
            <img src={movie.posterUrl} alt={movie.title} className="w-32 h-48 rounded-2xl object-cover shadow-2xl flex-shrink-0" />
            <div className="pt-12">
              <h1 className="text-2xl font-black tracking-display">{movie.title}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="flex items-center gap-1 text-sm font-bold text-cinema-gold">
                  <Star size={14} className="fill-current" /> {movie.rating}
                </span>
                <span className="text-sm text-muted-foreground">{movie.year}</span>
                {movie.genres.map((g) => (
                  <span key={g} className="text-xs px-2 py-0.5 rounded-full glass text-foreground/80">{g}</span>
                ))}
              </div>
            </div>
          </div>

          {movie.description && (
            <p className="text-sm text-foreground/70 leading-relaxed mt-5">{movie.description}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button className="flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-bold cinema-glow">
              <Play size={16} fill="currentColor" /> Assistir
            </button>
            <button onClick={addToWatchlist} className="flex items-center gap-2 glass text-foreground px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/10">
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
