import { motion } from "framer-motion";
import { TrendingUp, Clock, ArrowRight, Sparkles } from "lucide-react";
import MovieCard, { type MovieResult } from "@/components/MovieCard";

const TRENDING: MovieResult[] = [
  {
    id: "t1",
    title: "Ainda Estou Aqui",
    year: 2024,
    rating: 8.1,
    ageRating: "14+",
    runtime: "2h 15min",
    genres: ["Drama", "Histórico"],
    aiInsight: "Fernanda Torres em performance aclamada. Baseado na história real de Eunice Paiva durante a ditadura militar. O filme mais comentado do Brasil em 2024.",
    socialProof: "Indicado ao Oscar 2025",
    platforms: ["netflix"],
  },
  {
    id: "t2",
    title: "Nosferatu",
    year: 2024,
    rating: 7.8,
    ageRating: "16+",
    runtime: "2h 12min",
    genres: ["Terror", "Gótico"],
    aiInsight: "Robert Eggers reimagina o clássico de 1922. Visual deslumbrante e atmosfera sufocante. O r/horror considera o 'melhor remake de terror da década.'",
    platforms: ["prime", "disney"],
  },
];

const LEAVING_SOON: MovieResult[] = [
  {
    id: "l1",
    title: "Parasita",
    originalTitle: "Parasite",
    year: 2019,
    rating: 8.5,
    ageRating: "16+",
    runtime: "2h 12min",
    genres: ["Suspense", "Drama", "Comédia Negra"],
    aiInsight: "Sai da Netflix BR em 15 dias. Se você ainda não viu, agora é a hora. Vencedor de 4 Oscars incluindo Melhor Filme.",
    platforms: ["netflix"],
  },
];

const HomePage = () => {
  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              CineMatch
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-display">
            Boa noite 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Encontrei novidades nos seus catálogos.
          </p>
        </motion.div>
      </div>

      {/* Trending Section */}
      <section className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="text-base font-semibold">Em alta pra você</h2>
          </div>
          <button className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
            Ver mais <ArrowRight size={12} />
          </button>
        </div>
        <div className="space-y-3">
          {TRENDING.map((movie, i) => (
            <MovieCard key={movie.id} movie={movie} index={i} />
          ))}
        </div>
      </section>

      {/* Leaving Soon */}
      <section className="px-4 pb-24">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-cinema-red" />
            <h2 className="text-base font-semibold">Saindo em breve</h2>
          </div>
        </div>
        <div className="space-y-3">
          {LEAVING_SOON.map((movie, i) => (
            <MovieCard key={movie.id} movie={movie} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
