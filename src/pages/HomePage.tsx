import { motion } from "framer-motion";
import { TrendingUp, Clock, Sparkles, Flame, Heart, Globe, Star, Play } from "lucide-react";
import PosterCard, { type PosterMovie, posterImages } from "@/components/PosterCard";
import HorizontalScroll from "@/components/HorizontalScroll";

const HERO_MOVIE = {
  title: "Ainda Estou Aqui",
  year: 2024,
  rating: 8.1,
  genres: ["Drama", "Histórico"],
  description: "Fernanda Torres em performance aclamada. Baseado na história real de Eunice Paiva durante a ditadura militar.",
  posterKey: "poster-4",
  platforms: ["netflix" as const],
};

const TRENDING: PosterMovie[] = [
  { id: "t1", title: "Ainda Estou Aqui", year: 2024, rating: 8.1, posterKey: "poster-4", platforms: ["netflix"], genres: ["Drama"], matchPercent: 96 },
  { id: "t2", title: "Nosferatu", year: 2024, rating: 7.8, posterKey: "poster-2", platforms: ["prime", "disney"], genres: ["Terror"] },
  { id: "t3", title: "O Homem das Multidões", year: 2013, rating: 7.2, posterKey: "poster-1", platforms: ["prime"], genres: ["Drama"], matchPercent: 89 },
  { id: "t4", title: "Parasita", year: 2019, rating: 8.5, posterKey: "poster-3", platforms: ["netflix"], genres: ["Suspense"] },
  { id: "t5", title: "Blade Runner 2099", year: 2025, rating: 7.9, posterKey: "poster-5", platforms: ["prime"], genres: ["Ficção Científica"] },
  { id: "t6", title: "Tropa de Elite 3", year: 2025, rating: 7.5, posterKey: "poster-6", platforms: ["netflix"], genres: ["Ação"] },
];

const FOR_YOU: PosterMovie[] = [
  { id: "f1", title: "As Boas Maneiras", year: 2017, rating: 7.0, posterKey: "poster-9", platforms: ["disney"], genres: ["Terror"], matchPercent: 94 },
  { id: "f2", title: "O Som ao Redor", year: 2012, rating: 7.3, posterKey: "poster-1", platforms: ["netflix", "prime"], genres: ["Suspense"], matchPercent: 91 },
  { id: "f3", title: "Central do Brasil", year: 1998, rating: 8.0, posterKey: "poster-10", platforms: ["prime"], genres: ["Drama"], matchPercent: 87 },
  { id: "f4", title: "Bacurau", year: 2019, rating: 7.4, posterKey: "poster-6", platforms: ["netflix"], genres: ["Ação"], matchPercent: 85 },
  { id: "f5", title: "Aquarius", year: 2016, rating: 7.5, posterKey: "poster-4", platforms: ["prime"], genres: ["Drama"], matchPercent: 82 },
  { id: "f6", title: "O Auto da Compadecida 2", year: 2025, rating: 7.1, posterKey: "poster-7", platforms: ["disney"], genres: ["Comédia"], matchPercent: 80 },
];

const LEAVING_SOON: PosterMovie[] = [
  { id: "l1", title: "Parasita", year: 2019, rating: 8.5, posterKey: "poster-3", platforms: ["netflix"], genres: ["Suspense"] },
  { id: "l2", title: "A Vida é Bela", year: 1997, rating: 8.6, posterKey: "poster-7", platforms: ["prime"], genres: ["Drama"] },
  { id: "l3", title: "Whiplash", year: 2014, rating: 8.5, posterKey: "poster-8", platforms: ["netflix"], genres: ["Drama"] },
  { id: "l4", title: "Oldboy", year: 2003, rating: 8.4, posterKey: "poster-6", platforms: ["disney"], genres: ["Suspense"] },
];

const NEW_RELEASES: PosterMovie[] = [
  { id: "n1", title: "Blade Runner 2099", year: 2025, rating: 7.9, posterKey: "poster-5", platforms: ["prime"], genres: ["Ficção Científica"] },
  { id: "n2", title: "Tropa de Elite 3", year: 2025, rating: 7.5, posterKey: "poster-8", platforms: ["netflix"], genres: ["Ação"] },
  { id: "n3", title: "O Auto da Compadecida 2", year: 2025, rating: 7.1, posterKey: "poster-10", platforms: ["disney"], genres: ["Comédia"] },
  { id: "n4", title: "Maníaco do Parque", year: 2024, rating: 6.8, posterKey: "poster-9", platforms: ["prime"], genres: ["Crime"] },
  { id: "n5", title: "Meu Nome é Gal", year: 2024, rating: 6.5, posterKey: "poster-4", platforms: ["netflix"], genres: ["Biografia"] },
];

const NETFLIX_ORIGINALS: PosterMovie[] = [
  { id: "no1", title: "Ainda Estou Aqui", year: 2024, rating: 8.1, posterKey: "poster-4", platforms: ["netflix"], genres: ["Drama"] },
  { id: "no2", title: "3%", year: 2024, rating: 7.2, posterKey: "poster-5", platforms: ["netflix"], genres: ["Ficção Científica"] },
  { id: "no3", title: "Sintonia", year: 2024, rating: 6.9, posterKey: "poster-6", platforms: ["netflix"], genres: ["Drama"] },
  { id: "no4", title: "Cidade Invisível", year: 2024, rating: 7.0, posterKey: "poster-9", platforms: ["netflix"], genres: ["Fantasia"] },
  { id: "no5", title: "Bom Dia, Verônica", year: 2024, rating: 7.3, posterKey: "poster-1", platforms: ["netflix"], genres: ["Suspense"] },
];

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
  <div className="px-4 mb-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon size={16} className={iconColor} />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  </div>
);

const HomePage = () => {
  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto pb-24">
      {/* Hero Banner */}
      <div className="relative h-[420px] overflow-hidden">
        <img
          src={posterImages[HERO_MOVIE.posterKey]}
          alt={HERO_MOVIE.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

        {/* Hero content */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute bottom-0 left-0 right-0 p-5 pb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-primary" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              Recomendação CineMatch
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-display mb-1.5">
            {HERO_MOVIE.title}
          </h1>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center gap-1 text-sm font-semibold text-cinema-gold tabular-nums">
              <Star size={12} className="fill-current" /> {HERO_MOVIE.rating}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">{HERO_MOVIE.year}</span>
            {HERO_MOVIE.genres.map((g) => (
              <span key={g} className="text-xs text-muted-foreground">{g}</span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-4">
            {HERO_MOVIE.description}
          </p>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cinema-glow">
              <Play size={16} fill="currentColor" /> Assistir
            </button>
            <button className="flex items-center gap-2 bg-secondary/80 backdrop-blur-sm text-secondary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-secondary transition-colors">
              + Minha Lista
            </button>
          </div>
        </motion.div>
      </div>

      {/* Trending */}
      <section className="mt-6">
        <SectionHeader icon={TrendingUp} title="Em Alta no Brasil" />
        <HorizontalScroll>
          {TRENDING.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="lg" />
          ))}
        </HorizontalScroll>
      </section>

      {/* For You */}
      <section className="mt-8">
        <SectionHeader icon={Heart} iconColor="text-cinema-red" title="Feito pra Você" subtitle="com base no seu perfil" />
        <HorizontalScroll>
          {FOR_YOU.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="md" />
          ))}
        </HorizontalScroll>
      </section>

      {/* Leaving Soon */}
      <section className="mt-8">
        <SectionHeader icon={Clock} iconColor="text-cinema-red" title="Saindo em Breve" subtitle="últimos dias" />
        <HorizontalScroll>
          {LEAVING_SOON.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="md" />
          ))}
        </HorizontalScroll>
      </section>

      {/* New Releases */}
      <section className="mt-8">
        <SectionHeader icon={Flame} iconColor="text-cinema-gold" title="Lançamentos" />
        <HorizontalScroll>
          {NEW_RELEASES.map((movie, i) => (
            <PosterCard key={movie.id} movie={movie} index={i} size="lg" />
          ))}
        </HorizontalScroll>
      </section>

      {/* Netflix Originals */}
      <section className="mt-8">
        <SectionHeader icon={Globe} iconColor="text-cinema-red" title="Originais Netflix" />
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
