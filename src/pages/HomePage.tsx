import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock, Sparkles, Flame, Heart, Globe, Star, Play, Plus, Check, Compass, Loader2 } from "lucide-react";
import PosterCard from "@/components/PosterCard";
import MovieDetailModal from "@/components/MovieDetailModal";
import HorizontalScroll from "@/components/HorizontalScroll";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTasteCapture } from "@/hooks/useTasteCapture";
import { usePersonalizedHome } from "@/hooks/usePersonalizedHome";
import type { MoviePoster } from "@/lib/tmdb";
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
};

const ICON_MAP: Record<string, React.ElementType> = {
  heart: Heart,
  flame: Flame,
  compass: Compass,
  star: Star,
  trending: TrendingUp,
  clock: Clock,
  globe: Globe,
  sparkles: Sparkles,
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
  const { captureWatchlistAdd } = useTasteCapture();
  const { personalizedSections, tasteSummary, isLoading: personalizationLoading, hasPersonalization } = usePersonalizedHome();
  const [addedToList, setAddedToList] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MoviePoster | null>(null);

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
      captureWatchlistAdd(HERO.title, HERO.genres);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto pb-24 relative">
      {/* Background blurred gradient spots */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[200px] opacity-20" style={{ background: "hsl(280, 70%, 50%)" }} />
        <div className="absolute top-[10%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[200px] opacity-15" style={{ background: "hsl(330, 80%, 55%)" }} />
        <div className="absolute bottom-[5%] left-[20%] w-[40%] h-[35%] rounded-full blur-[180px] opacity-10" style={{ background: "hsl(260, 60%, 45%)" }} />
      </div>

      {/* Hero Card */}
      <div className="px-3 pt-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative rounded-3xl overflow-hidden glass-surface-strong"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
        >
          <div className="relative h-[70vh] min-h-[420px] max-h-[750px]">
            <img src={HERO.backdropUrl} alt={HERO.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center cinema-glow-sm">
                  <Sparkles size={12} className="text-primary-foreground" />
                </div>
                <span className="text-[11px] font-bold gradient-text uppercase tracking-[0.15em]">
                  {hasPersonalization ? "Escolhido pra Você" : "Recomendação CineMatch"}
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-display mb-3 text-foreground">{HERO.title}</h1>

              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="flex items-center gap-1 text-sm font-bold text-cinema-gold tabular-nums">
                  <Star size={14} className="fill-current" /> {HERO.rating}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">{HERO.year}</span>
                {HERO.genres.map((g) => (
                  <span key={g} className="text-xs px-2 py-0.5 rounded-full glass text-foreground/80">{g}</span>
                ))}
              </div>

              <p className="text-sm text-foreground/70 leading-relaxed max-w-lg mb-5">{HERO.description}</p>

              <div className="flex gap-3">
                <button className="flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-bold hover:opacity-90 transition-opacity cinema-glow">
                  <Play size={16} fill="currentColor" /> Assistir Agora
                </button>
                <button onClick={addHeroToWatchlist} className="flex items-center gap-2 glass text-foreground px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors">
                  {addedToList ? <Check size={16} /> : <Plus size={16} />}
                  {addedToList ? "Na Lista" : "Minha Lista"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Personalization loading indicator */}
      {user && personalizationLoading && (
        <div className="flex items-center justify-center gap-2 mt-8 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs">Personalizando sua experiência...</span>
        </div>
      )}

      {/* Taste summary badge */}
      {tasteSummary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mt-8 mb-2 glass rounded-2xl p-4 flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 cinema-glow-sm">
            <Sparkles size={14} className="text-primary-foreground" />
          </div>
          <div>
            <span className="text-[11px] font-bold gradient-text uppercase tracking-wider">Seu Perfil de Gosto</span>
            <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed">{tasteSummary}</p>
          </div>
        </motion.div>
      )}

      {/* PERSONALIZED SECTIONS (when AI has learned about the user) */}
      {hasPersonalization && personalizedSections.map((section, sIdx) => {
        const IconComp = ICON_MAP[section.icon] || Heart;
        return (
          <section key={section.key} className={sIdx === 0 ? "mt-8" : "mt-10"}>
            <SectionHeader icon={IconComp} title={section.title} subtitle={section.subtitle} />
            <HorizontalScroll>
              {section.movies.map((movie, i) => (
                <PosterCard key={movie.id} movie={movie} index={i} onSelect={setSelectedMovie} />
              ))}
            </HorizontalScroll>
          </section>
        );
      })}

      {/* DEFAULT SECTIONS (for new users or logged-out) */}
      {!hasPersonalization && (
        <>
          <section className="mt-10">
            <SectionHeader icon={TrendingUp} title="Em Alta" />
            <HorizontalScroll>
              {TRENDING.map((movie, i) => (
                <PosterCard key={movie.id} movie={movie} index={i} onSelect={setSelectedMovie} />
              ))}
            </HorizontalScroll>
          </section>

          <section className="mt-10">
            <SectionHeader icon={Heart} title="Feito pra Você" subtitle="baseado no seu perfil" />
            <HorizontalScroll>
              {FOR_YOU.map((movie, i) => (
                <PosterCard key={movie.id} movie={movie} index={i} onSelect={setSelectedMovie} />
              ))}
            </HorizontalScroll>
          </section>

          <section className="mt-10">
            <SectionHeader icon={Clock} title="Saindo em Breve" subtitle="últimos dias" />
            <HorizontalScroll>
              {LEAVING_SOON.map((movie, i) => (
                <PosterCard key={movie.id} movie={movie} index={i} onSelect={setSelectedMovie} />
              ))}
            </HorizontalScroll>
          </section>

          <section className="mt-10">
            <SectionHeader icon={Flame} title="Lançamentos" />
            <HorizontalScroll>
              {NEW_RELEASES.map((movie, i) => (
                <PosterCard key={movie.id} movie={movie} index={i} onSelect={setSelectedMovie} />
              ))}
            </HorizontalScroll>
          </section>

          <section className="mt-10 mb-4">
            <SectionHeader icon={Globe} title="Originais Netflix" />
            <HorizontalScroll>
              {NETFLIX_ORIGINALS.map((movie, i) => (
                <PosterCard key={movie.id} movie={movie} index={i} onSelect={setSelectedMovie} />
              ))}
            </HorizontalScroll>
          </section>
        </>
      )}

      {/* Always show Trending even with personalization */}
      {hasPersonalization && (
        <section className="mt-10 mb-4">
          <SectionHeader icon={TrendingUp} title="Em Alta" />
          <HorizontalScroll>
            {TRENDING.map((movie, i) => (
              <PosterCard key={movie.id} movie={movie} index={i} onSelect={setSelectedMovie} />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {selectedMovie && (
        <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
};

export default HomePage;
