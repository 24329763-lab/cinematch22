import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Film, Heart, Users } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface FriendProfile {
  display_name: string | null;
  favorite_genres: string[] | null;
}

interface CommonMovie {
  title: string;
  poster_url: string | null;
  genres: string[] | null;
}

const PartyPage = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  const [commonWatchlist, setCommonWatchlist] = useState<CommonMovie[]>([]);
  const [myGenres, setMyGenres] = useState<string[]>([]);
  const [friendGenres, setFriendGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !friendId) return;
    loadPartyData();
  }, [user, friendId]);

  const loadPartyData = async () => {
    if (!user || !friendId) return;
    setLoading(true);

    try {
      // Load friend profile & both watchlists in parallel
      const [friendProfileRes, myWatchlistRes, friendWatchlistRes, myProfileRes] = await Promise.all([
        supabase.from("profiles").select("display_name, favorite_genres").eq("user_id", friendId).single(),
        supabase.from("watchlist").select("title, poster_url, genres").eq("user_id", user.id),
        supabase.from("watchlist").select("title, poster_url, genres").eq("user_id", friendId),
        supabase.from("profiles").select("favorite_genres").eq("user_id", user.id).single(),
      ]);

      if (friendProfileRes.data) {
        setFriendProfile(friendProfileRes.data as FriendProfile);
        setFriendGenres(friendProfileRes.data.favorite_genres || []);
      }
      if (myProfileRes.data) {
        setMyGenres(myProfileRes.data.favorite_genres || []);
      }

      // Find common movies
      const myTitles = new Set((myWatchlistRes.data || []).map((m: any) => m.title.toLowerCase()));
      const common = (friendWatchlistRes.data || []).filter((m: any) => myTitles.has(m.title.toLowerCase()));
      setCommonWatchlist(common as CommonMovie[]);

      // Also find genre overlaps for suggestions
    } finally {
      setLoading(false);
    }
  };

  const commonGenres = myGenres.filter((g) => friendGenres.includes(g));

  if (!user) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Faça login para usar o Party Mode</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto px-4 pt-6 pb-24">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate("/profile")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 mx-auto cinema-glow">
              <Users size={28} className="text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-black tracking-display">
              🎉 Party Mode
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {friendProfile ? `Você + ${friendProfile.display_name || "Amigo"}` : "Carregando..."}
            </p>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground text-sm py-12">Encontrando filmes em comum...</div>
          ) : (
            <>
              {/* Common genres */}
              {commonGenres.length > 0 && (
                <div className="glass-surface rounded-2xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-cinema-gold" />
                    <h3 className="text-sm font-bold">Gêneros em Comum</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {commonGenres.map((g) => (
                      <span key={g} className="text-[11px] font-semibold px-3 py-1.5 rounded-full gradient-primary text-primary-foreground">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Friend's taste */}
              {friendGenres.length > 0 && (
                <div className="glass-surface rounded-2xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart size={16} className="text-primary" />
                    <h3 className="text-sm font-bold">Gosto de {friendProfile?.display_name || "Amigo"}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {friendGenres.map((g) => (
                      <span key={g} className="text-[11px] font-semibold px-3 py-1.5 rounded-full glass text-foreground/80">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Common watchlist */}
              <div className="glass-surface rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Film size={16} className="text-accent" />
                  <h3 className="text-sm font-bold">
                    Filmes na Lista de Ambos ({commonWatchlist.length})
                  </h3>
                </div>
                {commonWatchlist.length > 0 ? (
                  <div className="space-y-2.5">
                    {commonWatchlist.map((movie) => (
                      <div key={movie.title} className="flex items-center gap-3 p-3 rounded-xl glass">
                        {movie.poster_url && (
                          <img src={movie.poster_url} alt={movie.title} className="w-12 h-16 rounded-lg object-cover" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{movie.title}</p>
                          {movie.genres && (
                            <p className="text-[11px] text-muted-foreground">{movie.genres.slice(0, 3).join(", ")}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum filme em comum na lista ainda. Adicionem filmes às suas listas!
                  </p>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PartyPage;
