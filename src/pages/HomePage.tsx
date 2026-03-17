import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalizedHome } from "@/hooks/usePersonalizedHome";
import { supabase } from "@/integrations/supabase/client";
import { HeroCarousel } from "@/components/HeroCarousel";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { PosterCard } from "@/components/PosterCard";
import { SectionHeader } from "@/components/SectionHeader";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { ChatCTA } from "@/components/ChatCTA";
import { Loader2 } from "lucide-react";
import { Heart, Users, Flame, Compass, Star } from "lucide-react";

const ICON_MAP: { [key: string]: any } = {
  heart: Heart,
  flame: Flame,
  compass: Compass,
  star: Star,
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
  const { user, profile } = useAuth();
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
