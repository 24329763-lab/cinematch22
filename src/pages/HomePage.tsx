import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock, Sparkles, Flame, Heart, Globe, Star, Compass, Loader2 } from "lucide-react";
import PosterCard from "@/components/PosterCard";
import MovieDetailModal from "@/components/MovieDetailModal";
import HorizontalScroll from "@/components/HorizontalScroll";
import HeroCarousel from "@/components/HeroCarousel";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalizedHome } from "@/hooks/usePersonalizedHome";
import type { MoviePoster } from "@/lib/tmdb";
import {
  TRENDING, FOR_YOU, LEAVING_SOON, NEW_RELEASES, NETFLIX_ORIGINALS,
} from "@/lib/tmdb";

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
  const { personalizedSections, tasteSummary, isLoading: personalizationLoading, hasPersonalization } = usePersonalizedHome();
  const [selectedMovie, setSelectedMovie] = useState<MoviePoster | null>(null);

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto pb-24 relative">
      {/* Background blurred gradient spots */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[200px] opacity-20" style={{ background: "hsl(280, 70%, 50%)" }} />
        <div className="absolute top-[10%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[200px] opacity-15" style={{ background: "hsl(330, 80%, 55%)" }} />
        <div className="absolute bottom-[5%] left-[20%] w-[40%] h-[35%] rounded-full blur-[180px] opacity-10" style={{ background: "hsl(260, 60%, 45%)" }} />
      </div>

      {/* Hero Carousel */}
      <HeroCarousel personalizedSections={personalizedSections} hasPersonalization={hasPersonalization} trendingMovies={TRENDING} />

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
