import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Star, Play, Plus, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTasteCapture } from "@/hooks/useTasteCapture";
import type { MoviePoster } from "@/lib/tmdb";
import { MOVIE_BACKDROPS } from "@/lib/tmdb";

interface HeroMovie {
  id: string;
  title: string;
  year: number;
  rating: number;
  genres: string[];
  description: string;
  backdropUrl: string;
  posterUrl: string;
  platforms?: string[];
}

const DEFAULT_HEROES: HeroMovie[] = [
  {
    id: "hero-parasita",
    title: "Parasita",
    year: 2019,
    rating: 8.5,
    genres: ["Suspense", "Drama"],
    description: "Uma família pobre se infiltra na vida de uma família rica. Vencedor do Oscar de Melhor Filme — Bong Joon-ho no seu melhor.",
    backdropUrl: "/posters/parasita.jpg",
    posterUrl: "/posters/parasita.jpg",
  },
  {
    id: "hero-duna-2",
    title: "Duna: Parte 2",
    year: 2024,
    rating: 8.1,
    genres: ["Ficção Científica", "Épico"],
    description: "Paul Atreides se une aos Fremen numa jornada épica. Denis Villeneuve entrega uma das maiores experiências visuais do cinema.",
    backdropUrl: "/posters/duna-2.jpg",
    posterUrl: "/posters/duna-2.jpg",
  },
  {
    id: "hero-oppenheimer",
    title: "Oppenheimer",
    year: 2023,
    rating: 8.3,
    genres: ["Drama", "Biografia"],
    description: "A história do homem que criou a bomba atômica e enfrentou as consequências morais de sua invenção. Christopher Nolan no auge.",
    backdropUrl: "/posters/oppenheimer.jpg",
    posterUrl: "/posters/oppenheimer.jpg",
  },
  {
    id: "hero-whiplash",
    title: "Whiplash",
    year: 2014,
    rating: 8.5,
    genres: ["Drama", "Música"],
    description: "Um jovem baterista de jazz é pressionado além dos limites por um instrutor abusivo em busca da perfeição.",
    backdropUrl: "/posters/whiplash.jpg",
    posterUrl: "/posters/whiplash.jpg",
  },
];

const POSTER_BASE = "https://image.tmdb.org/t/p/w780";
const HERO_SET_SIZE = 4;
const HERO_ROTATE_MS = 12_000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function hashSeed(seed: number): number {
  let h = seed ^ 0x9e3779b9;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let state = hashSeed(seed) || 1;

  const rand = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };

  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getSixHourBucket(): number {
  return Math.floor(Date.now() / SIX_HOURS_MS);
}

function movieToHero(movie: any): HeroMovie {
  const posterUrl = movie.posterUrl || (movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : "/posters/ainda-estou-aqui.jpg");
  return {
    id: String(movie.id || movie.title),
    title: movie.title,
    year: Number(movie.year || 2024),
    rating: Number(movie.rating || 8.0),
    genres: Array.isArray(movie.genres) ? movie.genres : [],
    description: movie.description || "",
    backdropUrl: posterUrl,
    posterUrl,
    platforms: movie.platforms,
  };
}

interface HeroCarouselProps {
  personalizedSections?: any[];
  hasPersonalization: boolean;
}

export default function HeroCarousel({ personalizedSections, hasPersonalization }: HeroCarouselProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { captureWatchlistAdd } = useTasteCapture();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [sixHourBucket, setSixHourBucket] = useState(getSixHourBucket());

  // keep bucket synced so hero set changes every 6h even without reload
  useEffect(() => {
    const timer = setInterval(() => {
      setSixHourBucket((prev) => {
        const next = getSixHourBucket();
        return next !== prev ? next : prev;
      });
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const heroPool = useMemo(() => {
    if (hasPersonalization && personalizedSections && personalizedSections.length > 0) {
      const flat = personalizedSections.flatMap((section: any) => section.movies || []);
      const dedup = new Map<string, HeroMovie>();
      for (const movie of flat) {
        const key = String(movie.id || movie.title);
        if (!dedup.has(key)) dedup.set(key, movieToHero(movie));
      }
      const personal = Array.from(dedup.values()).filter((movie) => hasQualityPoster(movie.posterUrl));
      if (personal.length >= 2) return personal;
    }

    if (trendingMovies.length > 0) {
      return trendingMovies.map(movieToHero);
    }

    return DEFAULT_HEROES;
  }, [hasPersonalization, personalizedSections, trendingMovies]);

  const heroes = useMemo(() => {
    if (heroPool.length <= HERO_SET_SIZE) return heroPool;
    return seededShuffle(heroPool, sixHourBucket).slice(0, HERO_SET_SIZE);
  }, [heroPool, sixHourBucket]);

  function hasQualityPoster(url?: string): boolean {
    if (!url) return false;
    if (url.includes("placeholder")) return false;
    return url.includes("image.tmdb.org") || url.startsWith("/posters/");
  }

  // Auto-rotate every 12 seconds
  useEffect(() => {
    if (heroes.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroes.length);
    }, HERO_ROTATE_MS);
    return () => clearInterval(interval);
  }, [heroes.length]);

  // Reset index when hero set changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [heroes]);

  const hero = heroes[currentIndex] || DEFAULT_HEROES[0];

  const addToWatchlist = useCallback(async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Faça login para salvar" });
      return;
    }

    const slug = hero.id || hero.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("watchlist").upsert({
      user_id: user.id,
      movie_id: slug,
      title: hero.title,
      poster_url: hero.posterUrl,
      year: hero.year,
      rating: hero.rating,
      platforms: hero.platforms || ["netflix"],
      genres: hero.genres,
    }, { onConflict: "user_id,movie_id" });

    if (!error) {
      setAddedIds((prev) => new Set(prev).add(hero.id));
      toast({ title: "Adicionado à sua lista!" });
      captureWatchlistAdd(hero.title, hero.genres);
    }
  }, [user, hero, toast, captureWatchlistAdd]);

  const isAdded = addedIds.has(hero.id);

  return (
    <div className="px-3 pt-3">
      <div className="relative rounded-3xl overflow-hidden glass-surface-strong" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div className="relative h-[70vh] min-h-[420px] max-h-[750px]">
          <AnimatePresence mode="wait">
            <motion.img
              key={hero.id}
              src={hero.backdropUrl}
              alt={hero.title}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center cinema-glow-sm">
                <Sparkles size={12} className="text-primary-foreground" />
              </div>
              <span className="text-[11px] font-bold gradient-text uppercase tracking-[0.15em]">
                {hasPersonalization ? "Escolhido pra Você" : "Em Alta no Brasil"}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${hero.id}-text`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-display mb-3 text-foreground">
                  {hero.title}
                </h1>

                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="flex items-center gap-1 text-sm font-bold text-cinema-gold tabular-nums">
                    <Star size={14} className="fill-current" /> {hero.rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">{hero.year}</span>
                  {hero.genres.map((g) => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full glass text-foreground/80">{g}</span>
                  ))}
                </div>

                <p className="text-sm text-foreground/70 leading-relaxed max-w-lg mb-5">{hero.description}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-3">
              <button className="flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-bold hover:opacity-90 transition-opacity cinema-glow">
                <Play size={16} fill="currentColor" /> Assistir Agora
              </button>
              <button onClick={addToWatchlist} className="flex items-center gap-2 glass text-foreground px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors">
                {isAdded ? <Check size={16} /> : <Plus size={16} />}
                {isAdded ? "Na Lista" : "Minha Lista"}
              </button>
            </div>

            <div className="flex gap-1.5 mt-5">
              {heroes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-foreground/30"}`}
                  aria-label={`Ir para filme ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
