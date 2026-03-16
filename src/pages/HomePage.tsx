import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Heart, Star, Compass, Flame, TrendingUp, Clock, Globe, Loader2, MessageCircle } from "lucide-react";
import PosterCard from "@/components/PosterCard";
import MovieDetailModal from "@/components/MovieDetailModal";
import HorizontalScroll from "@/components/HorizontalScroll";
import HeroCarousel from "@/components/HeroCarousel";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalizedHome } from "@/hooks/usePersonalizedHome";
import { useNavigate } from "react-router-dom";
import type { MoviePoster } from "@/lib/tmdb";

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

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) => (
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
  </div>
);

const ChatCTA = () => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mt-10 mb-4 glass-surface rounded-2xl p-6 text-center"
    >
      <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 cinema-glow-sm">
        <MessageCircle size={20} className="text-primary-foreground" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">Sua home pode ser muito melhor</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-sm mx-auto">
        Converse com o chat sobre seus filmes favoritos, o que você curte e o que não curte — quanto mais eu souber, melhor fica sua home.
      </p>
      <button
        onClick={() => navigate("/chat")}
        className="gradient-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-bold cinema-glow-sm hover:opacity-90 transition-opacity"
      >
        <span className="flex items-center gap-2">
          <Sparkles size={14} /> Conversar agora
        </span>
      </button>
    </motion.div>
  );
};

const HomePage = () => {
  const { user } = useAuth();
  const { personalizedSections, tasteSummary, isLoading: personalizationLoading, hasPersonalization } = usePersonalizedHome();
  const [selectedMovie, setSelectedMovie] = useState<MoviePoster | null>(null);

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto pb-24 relative">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[200px] opacity-20" style={{ background: "hsl(280, 70%, 50%)" }} />
        <div className="absolute top-[10%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[200px] opacity-15" style={{ background: "hsl(330, 80%, 55%)" }} />
        <div className="absolute bottom-[5%] left-[20%] w-[40%] h-[35%] rounded-full blur-[180px] opacity-10" style={{ background: "hsl(260, 60%, 45%)" }} />
      </div>

      <HeroCarousel personalizedSections={personalizedSections} hasPersonalization={hasPersonalization} />

      {user && personalizationLoading && (
        <div className="flex items-center justify-center gap-2 mt-8 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs">Personalizando sua experiência...</span>
        </div>
      )}

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

      {/* Personalized sections only */}
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

      {/* Chat CTA when not enough personalized content */}
      {user && !personalizationLoading && (!hasPersonalization || personalizedSections.length < 2) && (
        <ChatCTA />
      )}

      {!user && <ChatCTA />}

      {selectedMovie && (
        <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
};

export default HomePage;
