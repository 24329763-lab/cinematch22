import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Play } from "lucide-react";
import type { MoviePoster } from "@/lib/tmdb";

type Platform = "netflix" | "prime" | "disney";

const platformBadge: Record<Platform, { label: string; bg: string }> = {
  netflix: { label: "N", bg: "bg-cinema-red" },
  prime: { label: "P", bg: "bg-cinema-gold" },
  disney: { label: "D+", bg: "bg-cinema-blue" },
};

const PosterCard = ({
  movie,
  index = 0,
  size = "md",
}: {
  movie: MoviePoster;
  index?: number;
  size?: "sm" | "md" | "lg" | "hero";
}) => {
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const sizeClasses = {
    sm: "w-[120px] h-[180px]",
    md: "w-[150px] h-[225px]",
    lg: "w-[180px] h-[270px]",
    hero: "w-[220px] h-[330px]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.05, y: -8 }}
      className={`relative flex-shrink-0 ${sizeClasses[size]} rounded-2xl overflow-hidden cursor-pointer group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
    >
      {/* Shimmer placeholder */}
      {!imgLoaded && (
        <div className="absolute inset-0 shimmer rounded-2xl" />
      )}

      {/* Poster image */}
      <img
        src={movie.posterUrl}
        alt={movie.title}
        onLoad={() => setImgLoaded(true)}
        className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
      />

      {/* Platform badges */}
      <div className="absolute top-2 right-2 flex gap-1">
        {movie.platforms.map((p) => {
          const cfg = platformBadge[p];
          return (
            <span
              key={p}
              className={`${cfg.bg} text-foreground text-[9px] font-bold w-5 h-5 rounded-md flex items-center justify-center shadow-lg`}
            >
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Match badge */}
      {movie.matchPercent && (
        <div className="absolute top-2 left-2">
          <span className="gradient-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums shadow-lg">
            {movie.matchPercent}%
          </span>
        </div>
      )}

      {/* Bottom gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h4 className="text-xs font-semibold leading-tight line-clamp-2 text-foreground drop-shadow-lg">
          {movie.title}
        </h4>
        <div className="flex items-center gap-1.5 mt-1">
          <Star size={10} className="text-cinema-gold fill-cinema-gold" />
          <span className="text-[10px] font-semibold tabular-nums text-cinema-gold">
            {movie.rating.toFixed(1)}
          </span>
          <span className="text-[10px] text-foreground/60 tabular-nums">{movie.year}</span>
        </div>
      </div>

      {/* Hover overlay */}
      <motion.div
        initial={false}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none"
      >
        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center cinema-glow-sm">
          <Play size={20} className="text-primary-foreground ml-0.5" fill="currentColor" />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PosterCard;
