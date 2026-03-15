import { motion } from "framer-motion";
import { Star, Clock, Shield } from "lucide-react";

export type Platform = "netflix" | "prime" | "disney";

export interface MovieResult {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  rating: number;
  ageRating: string;
  runtime: string;
  genres: string[];
  aiInsight: string;
  socialProof?: string;
  platforms: Platform[];
  posterUrl?: string;
  director?: string;
}

const platformConfig: Record<Platform, { label: string; color: string; bgClass: string }> = {
  netflix: { label: "Netflix", color: "text-cinema-red", bgClass: "bg-cinema-red/10 hover:bg-cinema-red/20" },
  prime: { label: "Prime Video", color: "text-cinema-gold", bgClass: "bg-cinema-gold/10 hover:bg-cinema-gold/20" },
  disney: { label: "Disney+", color: "text-cinema-blue", bgClass: "bg-cinema-blue/10 hover:bg-cinema-blue/20" },
};

const MovieCard = ({ movie, index = 0 }: { movie: MovieResult; index?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
      className="glass-surface rounded-2xl p-5 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold tracking-display text-foreground text-balance leading-tight">
            {movie.title}
          </h3>
          {movie.originalTitle && movie.originalTitle !== movie.title && (
            <p className="text-xs text-muted-foreground mt-0.5">{movie.originalTitle}</p>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-cinema-gold">
          <Star size={13} className="fill-current" />
          {movie.rating.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">{movie.year}</span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={11} />
          {movie.runtime}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Shield size={11} />
          {movie.ageRating}
        </span>
      </div>

      {/* Genres */}
      <div className="flex gap-1.5 flex-wrap">
        {movie.genres.map((genre) => (
          <span
            key={genre}
            className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground"
          >
            {genre}
          </span>
        ))}
      </div>

      {/* AI Insight */}
      <div className="border-l-2 border-primary pl-3.5 py-1">
        <p className="text-sm text-muted-foreground leading-relaxed">{movie.aiInsight}</p>
      </div>

      {/* Social Proof */}
      {movie.socialProof && (
        <p className="text-xs text-muted-foreground italic">💬 {movie.socialProof}</p>
      )}

      {/* Platform buttons */}
      <div className="flex items-center gap-2 mt-1 pt-3 border-t border-border">
        {movie.platforms.map((platform) => {
          const config = platformConfig[platform];
          return (
            <button
              key={platform}
              className={`flex-1 text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors ${config.bgClass} ${config.color}`}
            >
              Assistir na {config.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MovieCard;
