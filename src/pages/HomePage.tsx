import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock, Sparkles, Flame, Heart, Globe, Star, Play, Plus, Check } from "lucide-react";
import PosterCard from "@/components/PosterCard";
import HorizontalScroll from "@/components/HorizontalScroll";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  TRENDING, FOR_YOU, LEAVING_SOON, NEW_RELEASES, NETFLIX_ORIGINALS,
  MOVIE_BACKDROPS,
} from "@/lib/tmdb";

const HERO = {
  id: "hero-ainda-estou-aqui",
  title: "Ainda Estou Aqui",
  year: 2024,
  rating: 8.1,
  genres: ["Drama", "Histórico"],
  description: "Fernanda Torres em performance aclamada mundialmente. Baseado na história real de Eunice Paiva durante a ditadura militar brasileira.",
  backdropUrl: MOVIE_BACKDROPS["ainda-estou-aqui"] || "/posters/ainda-estou-aqui-backdrop.jpg",
  posterUrl: "/posters/ainda-estou-aqui.jpg",
  dominantColor: { r: 40, g: 60, b: 80 },
};

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) => (
  <div className="px-5 mb-4 flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
        <Icon size={14} className="text-primary-foreground" />
      </div>
      <div>
        <h2 className="text-base font-bold text-foreground tracking-display">{title}</h2>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
    </div>
    <button className="text-xs text-primary font-medium hover:underline">Ver Tudo</button>
  </div>
);

const HomePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addedToList, setAddedToList] = useState(false);

  const addHeroToWatchlist = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Faça login para salvar" });
      return;
    }
    const { error } = await supabase.from("watchlist").upsert({
      user_id: user.id,
      movie_id: "ainda-estou-aqui",
      title: HERO.title,
      poster_url: HERO.posterUrl,
      year: HERO.year,
      rating: HERO.rating,
      platforms: ["netflix"],
      genres: HERO.genres,
    }, { onConflict: "user_id,movie_id" });
    if (!error) {
      setAddedToList(true);
      toast({ title: "Adicionado à sua lista!" });
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto pb-24 relative">
      {/* Dynamic background gradient from hero */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-0 left-0 w-full h-[60vh]"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(${HERO.dominantColor.r}, ${HERO.dominantColor.g}, ${HERO.dominantColor.b}, 0.15) 0%, transparent 70%)`,
          }}
        />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/3 bg-primary/3 blur-[150px] rounded-full" />
      </div>

      {/* Hero Card */}
      <div className="px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative rounded-3xl overflow-hidden mx-auto max-w-5xl"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
        >
          <div className="relative h-[420px]">
            <img
              src={HERO.backdropUrl}
              alt={HERO.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center cinema-glow-sm">
                  <Sparkles size={12} className="text-primary-foreground" />
                </div>
                <span className="text-[11px] font-bold gradient-text uppercase tracking-[0.15em]">
                  Recomendação CineMatch
                </span>
              </div>

              <h1 className="text-4xl font-black tracking-display mb-2 text-foreground">
                {HERO.title}
              </h1>

              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="flex items-center gap-1 text-sm font-bold text-cinema-gold tabular-nums">
                  <Star size={14} className="fill-current" /> {HERO.rating}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">{HERO.year}</span>
                {HERO.genres.map((g) => (
                  <span key={g} className="text-xs px-2 py-0.5 rounded-full glass text-foreground/80">{g}</span>
                ))}
              </div>

              <p className="text-sm text-foreground/70 leading-relaxed max-w-lg mb-5">
                {HERO.description}
              </p>

              <div className="flex gap-3">
                <button className="flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-bold hover:opacity-90 transition-opacity cinema-glow">
                  <Play size={16} fill="currentColor" /> Assistir Agora
                </button>
                <button
                  onClick={addHeroToWatchlist}
                  className="flex items-center gap-2 glass text-foreground px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  {addedToList ? <Check size={16} /> : <Plus size={16} />}
                  {addedToList ? "Na Lista" : "Minha Lista"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Trending */}
      <section className="mt-10">
        <SectionHeader icon={TrendingUp} title="Em Alta no Brasil" />
        <HorizontalScroll>
          {TRENDING.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="hero" />
          ))}
        </HorizontalScroll>
      </section>

      {/* For You */}
      <section className="mt-10">
        <SectionHeader icon={Heart} title="Feito pra Você" subtitle="baseado no seu perfil" />
        <HorizontalScroll>
          {FOR_YOU.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="lg" />
          ))}
        </HorizontalScroll>
      </section>

      {/* Leaving Soon */}
      <section className="mt-10">
        <SectionHeader icon={Clock} title="Saindo em Breve" subtitle="últimos dias" />
        <HorizontalScroll>
          {LEAVING_SOON.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="lg" />
          ))}
        </HorizontalScroll>
      </section>

      {/* New Releases */}
      <section className="mt-10">
        <SectionHeader icon={Flame} title="Lançamentos" />
        <HorizontalScroll>
          {NEW_RELEASES.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="hero" />
          ))}
        </HorizontalScroll>
      </section>

      {/* Netflix Originals */}
      <section className="mt-10 mb-4">
        <SectionHeader icon={Globe} title="Originais Netflix" />
        <HorizontalScroll>
          {NETFLIX_ORIGINALS.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="lg" />
          ))}
        </HorizontalScroll>
      </section>
    </div>
  );
};

export default HomePage;
