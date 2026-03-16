import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Heart, Users, Zap, Music, Film, Globe } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface TasteSignal {
  signal_type: string;
  category: string;
  value: string;
  confidence: number;
}

interface FriendProfile {
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  favorite_genres: string[] | null;
  taste_bio: string | null;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  genre: Film,
  mood: Heart,
  director: Sparkles,
  theme: Globe,
  era: Music,
};

const PartyPage = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  const [commonTastes, setCommonTastes] = useState<{ category: string; values: string[] }[]>([]);
  const [myUnique, setMyUnique] = useState<string[]>([]);
  const [friendUnique, setFriendUnique] = useState<string[]>([]);
  const [compatibility, setCompatibility] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !friendId) return;
    loadPartyData();
  }, [user, friendId]);

  const loadPartyData = async () => {
    if (!user || !friendId) return;
    setLoading(true);

    try {
      const [friendProfileRes, mySignalsRes, friendSignalsRes] = await Promise.all([
        supabase.from("profiles").select("display_name, nickname, avatar_url, favorite_genres, taste_bio").eq("user_id", friendId).single(),
        supabase.from("taste_signals").select("signal_type, category, value, confidence").eq("user_id", user.id),
        supabase.from("taste_signals").select("signal_type, category, value, confidence").eq("user_id", friendId),
      ]);

      if (friendProfileRes.data) {
        setFriendProfile(friendProfileRes.data as any);
      }

      const mySignals = (mySignalsRes.data || []) as TasteSignal[];
      const friendSignals = (friendSignalsRes.data || []) as TasteSignal[];

      // Find common taste values
      const myValues = new Set(mySignals.map((s) => `${s.category}::${s.value.toLowerCase()}`));
      const friendValues = new Set(friendSignals.map((s) => `${s.category}::${s.value.toLowerCase()}`));

      const commonSet = new Set([...myValues].filter((v) => friendValues.has(v)));

      // Group common tastes by category
      const grouped: Record<string, string[]> = {};
      commonSet.forEach((key) => {
        const [cat, val] = key.split("::");
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(val);
      });

      setCommonTastes(
        Object.entries(grouped).map(([category, values]) => ({ category, values }))
      );

      // Unique interests
      const myUniqueVals = [...myValues].filter((v) => !friendValues.has(v)).map((v) => v.split("::")[1]).slice(0, 6);
      const friendUniqueVals = [...friendValues].filter((v) => !myValues.has(v)).map((v) => v.split("::")[1]).slice(0, 6);
      setMyUnique(myUniqueVals);
      setFriendUnique(friendUniqueVals);

      // Compatibility score
      const total = new Set([...myValues, ...friendValues]).size;
      const score = total > 0 ? Math.round((commonSet.size / total) * 100) : 0;
      setCompatibility(score);
    } finally {
      setLoading(false);
    }
  };

  const friendName = friendProfile?.nickname || friendProfile?.display_name || "Amigo";

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
              <Zap size={28} className="text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-black tracking-display">
              🎉 Party Mode
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Você + {friendName}
            </p>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground text-sm py-12">Analisando perfis de gosto...</div>
          ) : (
            <>
              {/* Compatibility score */}
              <div className="glass-surface rounded-2xl p-6 mb-6 text-center">
                <div className="text-5xl font-black gradient-text mb-2">{compatibility}%</div>
                <p className="text-sm text-muted-foreground">Compatibilidade de Gosto</p>
                <div className="w-full h-2 rounded-full bg-muted/30 mt-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${compatibility}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full gradient-primary"
                  />
                </div>
              </div>

              {/* Common tastes */}
              {commonTastes.length > 0 && (
                <div className="glass-surface rounded-2xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-cinema-gold" />
                    <h3 className="text-sm font-bold">Gostos em Comum</h3>
                  </div>
                  <div className="space-y-3">
                    {commonTastes.map(({ category, values }) => {
                      const Icon = CATEGORY_ICONS[category] || Heart;
                      return (
                        <div key={category}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Icon size={12} className="text-muted-foreground" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{category}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {values.map((v) => (
                              <span key={v} className="text-[11px] font-semibold px-3 py-1.5 rounded-full gradient-primary text-primary-foreground capitalize">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unique tastes */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="glass-surface rounded-2xl p-4">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Só você curte</p>
                  <div className="flex flex-wrap gap-1">
                    {myUnique.length > 0 ? myUnique.map((v) => (
                      <span key={v} className="text-[10px] px-2 py-1 rounded-full glass text-foreground/70 capitalize">{v}</span>
                    )) : (
                      <span className="text-[10px] text-muted-foreground">Vocês são bem parecidos!</span>
                    )}
                  </div>
                </div>
                <div className="glass-surface rounded-2xl p-4">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Só {friendName} curte</p>
                  <div className="flex flex-wrap gap-1">
                    {friendUnique.length > 0 ? friendUnique.map((v) => (
                      <span key={v} className="text-[10px] px-2 py-1 rounded-full glass text-foreground/70 capitalize">{v}</span>
                    )) : (
                      <span className="text-[10px] text-muted-foreground">Vocês são bem parecidos!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Friend's bio */}
              {friendProfile?.taste_bio && (
                <div className="glass rounded-2xl p-4 mb-6 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                    <Heart size={12} className="text-primary-foreground" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold gradient-text uppercase tracking-wider">O que {friendName} diz</span>
                    <p className="text-xs text-foreground/70 mt-0.5 leading-relaxed">{friendProfile.taste_bio}</p>
                  </div>
                </div>
              )}

              {commonTastes.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <p>Ainda não há dados de gosto suficientes.</p>
                  <p className="text-xs mt-1">Conversem no chat para construir seus perfis!</p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PartyPage;
