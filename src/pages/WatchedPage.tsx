import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Film, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const WatchedPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("watched")
      .select("*")
      .eq("user_id", user.id)
      .order("watched_at", { ascending: false })
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, [user]);

  const rateMovie = async (id: string, rating: number) => {
    await supabase.from("watched").update({ user_rating: rating }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, user_rating: rating } : i)));
    toast({ title: `Avaliado com ${rating}/10!` });
  };

  const removeItem = async (id: string) => {
    await supabase.from("watched").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Faça login para ver seus assistidos</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] px-4 pt-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-6">
          <Film size={20} className="text-cinema-gold" />
          <h1 className="text-2xl font-black tracking-display">Assistidos</h1>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 shimmer rounded-2xl" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum filme assistido ainda. Marque filmes da sua lista como assistidos!</p>
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
                    <span className="text-xs text-muted-foreground">{item.year}</span>
                  </div>
                  {/* Star rating */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }, (_, idx) => (
                      <button
                        key={idx}
                        onClick={() => rateMovie(item.id, idx + 1)}
                        className="transition-all hover:scale-125"
                      >
                        <Star
                          size={14}
                          className={
                            idx < (item.user_rating || 0)
                              ? "text-cinema-gold fill-cinema-gold"
                              : "text-muted-foreground/30"
                          }
                        />
                      </button>
                    ))}
                    {item.user_rating && (
                      <span className="text-xs font-bold text-cinema-gold ml-1">{item.user_rating}/10</span>
                    )}
                  </div>
                  <button onClick={() => removeItem(item.id)} className="self-start flex items-center gap-1 text-xs text-destructive/70 hover:text-destructive mt-1">
                    <Trash2 size={12} /> Remover
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchedPage;
