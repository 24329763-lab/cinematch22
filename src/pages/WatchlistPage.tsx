import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";

const WatchlistPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false })
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, [user]);

  const removeItem = async (id: string) => {
    await supabase.from("watchlist").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Removido da lista" });
  };

  const markWatched = async (item: any) => {
    await supabase.from("watched").upsert({
      user_id: user!.id,
      movie_id: item.movie_id,
      title: item.title,
      poster_url: item.poster_url,
      year: item.year,
      platforms: item.platforms,
      genres: item.genres,
    }, { onConflict: "user_id,movie_id" });
    await supabase.from("watchlist").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: "Movido para Assistidos!" });
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Faça login para ver sua lista</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] px-4 pt-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-6">
          <Heart size={20} className="text-primary" />
          <h1 className="text-2xl font-black tracking-display">Minha Lista</h1>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 shimmer rounded-2xl" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Sua lista está vazia. Adicione filmes da página inicial ou do chat!</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-surface rounded-2xl overflow-hidden flex"
              >
                <img src={item.poster_url || "/placeholder.svg"} alt={item.title} className="w-20 h-28 object-cover" />
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {item.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-cinema-gold">
                          <Star size={10} className="fill-current" /> {item.rating}
                        </span>
                      )}
                      {item.year && <span className="text-xs text-muted-foreground">{item.year}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => markWatched(item)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl glass text-foreground/70 hover:bg-white/10">
                      <Eye size={12} /> Assistido
                    </button>
                    <button onClick={() => removeItem(item.id)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl glass text-destructive/70 hover:bg-destructive/10">
                      <Trash2 size={12} /> Remover
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchlistPage;
