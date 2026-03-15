import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Play } from "lucide-react";
import type { Platform } from "@/components/MovieCard";

import poster1 from "@/assets/posters/poster-1.jpg";
import poster2 from "@/assets/posters/poster-2.jpg";
import poster3 from "@/assets/posters/poster-3.jpg";
import poster4 from "@/assets/posters/poster-4.jpg";
import poster5 from "@/assets/posters/poster-5.jpg";
import poster6 from "@/assets/posters/poster-6.jpg";
import poster7 from "@/assets/posters/poster-7.jpg";
import poster8 from "@/assets/posters/poster-8.jpg";
import poster9 from "@/assets/posters/poster-9.jpg";
import poster10 from "@/assets/posters/poster-10.jpg";

export const posterImages: Record<string, string> = {
  "poster-1": poster1,
  "poster-2": poster2,
  "poster-3": poster3,
  "poster-4": poster4,
  "poster-5": poster5,
  "poster-6": poster6,
  "poster-7": poster7,
  "poster-8": poster8,
  "poster-9": poster9,
  "poster-10": poster10,
};

const platformBadge: Record<Platform, { label: string; bg: string; text: string }> = {
  netflix: { label: "N", bg: "bg-cinema-red", text: "text-foreground" },
  prime: { label: "P", bg: "bg-cinema-gold", text: "text-background" },
  disney: { label: "D+", bg: "bg-cinema-blue", text: "text-foreground" },
};

export interface PosterMovie {
  id: string;
  title: string;
  year: number;
  rating: number;
  posterKey: string;
  platforms: Platform[];
  genres: string[];
  matchPercent?: number;
}

const PosterCard = ({
  movie,
  index = 0,
  size = "md",
}: {
  movie: PosterMovie;
  index?: number;
  size?: "sm" | "md" | "lg" | "hero";
}) => {
  const [hovered, setHovered] = useState(false);

  const sizeClasses = {
    sm: "w-28 h-[168px]",
    md: "w-36 h-[216px]",
    lg: "w-44 h-[264px]",
    hero: "w-64 h-[360px]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
      className={`relative flex-shrink-0 ${sizeClasses[size]} rounded-xl overflow-hidden cursor-pointer group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Poster image */}
      <img
        src={posterImages[movie.posterKey]}
        alt={movie.title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />

      {/* Platform badges - top right */}
      <div className="absolute top-2 right-2 flex gap-1">
        {movie.platforms.map((p) => {
          const cfg = platformBadge[p];
          return (
            <span
              key={p}
              className={`${cfg.bg} ${cfg.text} text-[9px] font-bold w-5 h-5 rounded-md flex items-center justify-center`}
            >
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Match percent badge */}
      {movie.matchPercent && (
        <div className="absolute top-2 left-2">
          <span className="bg-primary/90 text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums">
            {movie.matchPercent}%
          </span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <h4 className="text-xs font-semibold leading-tight line-clamp-2 text-foreground">
          {movie.title}
        </h4>
        <div className="flex items-center gap-1.5 mt-1">
          <Star size={10} className="text-cinema-gold fill-cinema-gold" />
          <span className="text-[10px] font-semibold tabular-nums text-cinema-gold">
            {movie.rating.toFixed(1)}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">{movie.year}</span>
        </div>
      </div>

      {/* Hover play overlay */}
      <motion.div
        initial={false}
        animate={{ opacity: hovered ? 1 : 0 }}
        className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center"
      >
        <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center cinema-glow">
          <Play size={18} className="text-primary-foreground ml-0.5" fill="currentColor" />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PosterCard;
