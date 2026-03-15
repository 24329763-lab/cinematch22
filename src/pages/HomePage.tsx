import { motion } from "framer-motion";
import { TrendingUp, Clock, Sparkles, Flame, Heart, Globe, Star, Play } from "lucide-react";
import PosterCard from "@/components/PosterCard";
import HorizontalScroll from "@/components/HorizontalScroll";
import {
  TRENDING, FOR_YOU, LEAVING_SOON, NEW_RELEASES, NETFLIX_ORIGINALS,
  MOVIE_BACKDROPS,
} from "@/lib/tmdb";

const HERO = {
  title: "Ainda Estou Aqui",
  year: 2024,
  rating: 8.1,
  genres: ["Drama", "Histórico"],
  description: "Fernanda Torres em performance aclamada mundialmente. Baseado na história real de Eunice Paiva durante a ditadura militar brasileira.",
  backdropUrl: MOVIE_BACKDROPS["ainda-estou-aqui"] || "/posters/ainda-estou-aqui-backdrop.jpg",
  posterUrl: "/posters/ainda-estou-aqui.jpg",
};

const SectionHeader = ({
  icon: Icon,
  iconColor = "text-primary",
  title,
  subtitle,
}: {
  icon: React.ElementType;
  iconColor?: string;
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
  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto pb-24">
      {/* Hero Banner */}
      <div className="relative h-[480px] overflow-hidden">
        <img
          src={HERO.backdropUrl}
          alt={HERO.title}
          className="w-full h-full object-cover"
        />
        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />

        {/* Hero content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute bottom-0 left-0 right-0 p-6 pb-10"
        >
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
            <button className="flex items-center gap-2 glass text-foreground px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors">
              + Minha Lista
            </button>
          </div>
        </motion.div>
      </div>

      {/* Trending */}
      <section className="mt-8">
        <SectionHeader icon={TrendingUp} title="Em Alta no Brasil" />
        <HorizontalScroll>
          {TRENDING.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="lg" />
          ))}
        </HorizontalScroll>
      </section>

      {/* For You */}
      <section className="mt-10">
        <SectionHeader icon={Heart} title="Feito pra Você" subtitle="baseado no seu perfil" />
        <HorizontalScroll>
          {FOR_YOU.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="md" />
          ))}
        </HorizontalScroll>
      </section>

      {/* Leaving Soon */}
      <section className="mt-10">
        <SectionHeader icon={Clock} title="Saindo em Breve" subtitle="últimos dias" />
        <HorizontalScroll>
          {LEAVING_SOON.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="md" />
          ))}
        </HorizontalScroll>
      </section>

      {/* New Releases */}
      <section className="mt-10">
        <SectionHeader icon={Flame} title="Lançamentos" />
        <HorizontalScroll>
          {NEW_RELEASES.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="lg" />
          ))}
        </HorizontalScroll>
      </section>

      {/* Netflix Originals */}
      <section className="mt-10 mb-4">
        <SectionHeader icon={Globe} title="Originais Netflix" />
        <HorizontalScroll>
          {NETFLIX_ORIGINALS.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="md" />
          ))}
        </HorizontalScroll>
      </section>
    </div>
  );
};

export default HomePage;
