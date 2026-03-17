import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Heart,
  Star,
  Compass,
  Flame,
  TrendingUp,
  Clock,
  Globe,
  Loader2,
  MessageCircle,
  Users,
} from "lucide-react";
import PosterCard from "@/components/PosterCard"; // Corrected import
import MovieDetailModal from "@/components/MovieDetailModal"; // Corrected import
import HorizontalScroll from "@/components/HorizontalScroll"; // Corrected import
import HeroCarousel from "@/components/HeroCarousel"; // Corrected import
import { useAuth } from "@/hooks/useAuth";
import { usePersonalizedHome } from "@/hooks/usePersonalizedHome";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

// Re-integrated SectionHeader component
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
  </div>
);

// Re-integrated ChatCTA component
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
        Converse com o chat sobre seus filmes favoritos, o que você curte e o que não curte — quanto mais eu souber,
        melhor fica sua home.
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

interface Movie {
  id: string;
  title: string;
  year: number;
  rating: number;
  genres: string[];
  platforms: string[];
  description: string;
  posterUrl: string;
  matchPercent?: number;
}

interface FriendWatchlist {
  friendId: string;
  friendName: string;
  movies: Movie[];
}

const HomePage = () => {
  const { user, profile } = useAuth(); // Added profile here
  const { personalizedSections, isLoading: personalizationLoading, hasPersonalization } = usePersonalizedHome();
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<Movie[]>([]);
  const [friendRows, setFriendRows] = useState<FriendWatchlist[]>([]);

  // Fetch Watchlist Items
  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!user) {
        setWatchlistItems([]);
        return;
      }
      // NOTE: This assumes 'user_watchlist' table exists and is correctly typed in Supabase types.ts
      const { data, error } = await supabase
        .from("user_watchlist") // Use the new user_watchlist table
        .select("movie_id, added_at")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });

      if (error) {
        console.error("Error fetching watchlist:", error);
        return;
      }

      // For now, we'll just show placeholders or fetch minimal data.
      // In a full implementation, you'd fetch full movie details from TMDB for these IDs.
      const moviesFromWatchlist: Movie[] = data.map((item) => ({
        id: item.movie_id,
        title: `Movie ${item.movie_id}`, // Placeholder
        year: 2024, // Placeholder
        rating: 0, // Placeholder
        genres: [], // Placeholder
        platforms: [], // Placeholder
        description: "", // Placeholder
        posterUrl: "/placeholder.svg", // Placeholder
      }));
      setWatchlistItems(moviesFromWatchlist);
    };

    fetchWatchlist();
  }, [user]);

  // Fetch Friend Watchlists (Party Mode - will be fully implemented later)
  useEffect(() => {
    const loadFriendRows = async () => {
      if (!user) {
        setFriendRows([]);
        return;
      }
      // Placeholder for friend fetching logic
      // This will eventually use the new 'friends' and 'party_members' tables
      const friendIds: string[] = []; // Example: get actual friend IDs from 'friends' table

      if (friendIds.length === 0) return;

      // NOTE: This assumes 'profiles' and 'user_watchlist' tables are correctly typed
      const [profilesRes, ...watchlistResults] = await Promise.all([
        supabase.from("profiles").select("id, nickname, display_name").in("id", friendIds),
        ...friendIds.map((fid: string) =>
          supabase
            .from("user_watchlist")
            .select("movie_id")
            .eq("user_id", fid)
            .order("added_at", { ascending: false })
            .limit(15),
        ),
      ]);

      const profiles = profilesRes.data || [];
      const rows: FriendWatchlist[] = [];

      friendIds.forEach((fid: string, idx: number) => {
        const profile = profiles.find((p: any) => p.id === fid);
        const items = (watchlistResults[idx] as any)?.data || [];
        if (items.length > 0) {
          const friendMovies: Movie[] = items.map((item: any) => ({
            id: item.movie_id,
            title: `Friend Movie ${item.movie_id}`, // Placeholder
            year: 2024, // Placeholder
            rating: 0, // Placeholder
            genres: [], // Placeholder
            platforms: [], // Placeholder
            description: "", // Placeholder
            posterUrl: "/placeholder.svg", // Placeholder
          }));

          rows.push({
            friendId: fid,
            friendName: (profile as any)?.nickname || (profile as any)?.display_name || "Amigo",
            movies: friendMovies,
          });
        }
      });
      setFriendRows(rows);
    };
    loadFriendRows();
  }, [user]);

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto pb-24 relative">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[200px] opacity-20"
          style={{ background: "hsl(280, 70%, 50%)" }}
        />
        <div
          className="absolute top-[10%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[200px] opacity-15"
          style={{ background: "hsl(330, 80%, 55%)" }}
        />
        <div
          className="absolute bottom-[5%] left-[20%] w-[40%] h-[35%] rounded-full blur-[180px] opacity-10"
          style={{ background: "hsl(260, 60%, 45%)" }}
        />
      </div>

      <HeroCarousel personalizedSections={personalizedSections} hasPersonalization={hasPersonalization} />

      {user && personalizationLoading && (
        <div className="flex items-center justify-center gap-2 mt-8 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs">Personalizando sua experiência...</span>
        </div>
      )}

      {/* Removed the tasteSummary display as requested */}

      {/* My List row */}
      {watchlistItems.length > 0 && (
        <section className="mt-8">
          <SectionHeader icon={Heart} title="Minha Lista" subtitle="Filmes que você salvou" />
          <HorizontalScroll>
            {watchlistItems.map((movie, i) => (
              <PosterCard key={movie.id} movie={movie} index={i} onSelect={setSelectedMovie} />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Personalized sections */}
      {hasPersonalization &&
        personalizedSections.map((section, sIdx) => {
          const IconComp = ICON_MAP[section.icon] || Heart;
          return (
            <section key={section.key} className={sIdx === 0 && watchlistItems.length === 0 ? "mt-8" : "mt-10"}>
              <SectionHeader icon={IconComp} title={section.title} subtitle={section.subtitle} />
              <HorizontalScroll>
                {section.movies.map((movie, i) => (
                  <PosterCard key={movie.id} movie={movie} index={i} onSelect={setSelectedMovie} />
                ))}
              </HorizontalScroll>
            </section>
          );
        })}

      {/* Friend rows */}
      {friendRows.map((fr) => (
        <section key={fr.friendId} className="mt-10">
          <SectionHeader icon={Users} title={`Favoritos de ${fr.friendName}`} subtitle="Da lista do seu amigo" />
          <HorizontalScroll>
            {fr.movies.map((movie, i) => (
              <PosterCard key={movie.id} movie={movie} index={i} onSelect={setSelectedMovie} />
            ))}
          </HorizontalScroll>
        </section>
      ))}

      {/* Chat CTA when not enough personalized content */}
      {user && !personalizationLoading && (!hasPersonalization || personalizedSections.length < 3) && <ChatCTA />}

      {!user && <ChatCTA />}

      {selectedMovie && <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
};

export default HomePage;
