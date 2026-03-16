import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Film, Heart, Users, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const FRIENDS = [
  { name: "João", matchScore: 87, avatar: "J" },
  { name: "Maria", matchScore: 72, avatar: "M" },
  { name: "Pedro", matchScore: 64, avatar: "P" },
];

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Faça login para ver seu perfil</p>
          <button onClick={() => navigate("/auth")} className="gradient-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-bold cinema-glow-sm">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto px-4 pt-8 pb-24">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-20 right-0 w-48 h-48 rounded-full bg-primary/5 blur-[80px]" />
        <div className="absolute bottom-40 left-0 w-48 h-48 rounded-full bg-accent/5 blur-[80px]" />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto">
        {/* Profile header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mb-4 cinema-glow">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User size={36} className="text-primary-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-black tracking-display">{profile?.display_name || user.email}</h1>
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </div>

        {/* Taste summary */}
        {profile?.favorite_genres && profile.favorite_genres.length > 0 && (
          <div className="glass-surface rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Film size={16} className="text-primary" />
              <h3 className="text-sm font-bold">Seu Gosto</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.favorite_genres.map((g: string) => (
                <span key={g} className="text-[11px] font-semibold px-3 py-1.5 rounded-full gradient-primary text-primary-foreground">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="space-y-2 mb-6">
          <button onClick={() => navigate("/watchlist")} className="w-full flex items-center gap-3 p-4 rounded-2xl glass-surface hover:bg-white/10 transition-all">
            <Heart size={18} className="text-primary" />
            <span className="text-sm font-semibold flex-1 text-left">Minha Lista</span>
          </button>
          <button onClick={() => navigate("/watched")} className="w-full flex items-center gap-3 p-4 rounded-2xl glass-surface hover:bg-white/10 transition-all">
            <Film size={18} className="text-cinema-gold" />
            <span className="text-sm font-semibold flex-1 text-left">Assistidos</span>
          </button>
        </div>

        {/* Friends */}
        <div className="glass-surface rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-accent" />
              <h3 className="text-sm font-bold">Conexões</h3>
            </div>
            <button className="text-xs text-primary font-semibold">+ Adicionar</button>
          </div>
          <div className="space-y-2.5">
            {FRIENDS.map((friend) => (
              <div key={friend.name} className="flex items-center gap-3 p-3.5 rounded-xl glass">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {friend.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{friend.name}</p>
                  <p className="text-[11px] text-muted-foreground">{friend.matchScore}% de compatibilidade</p>
                </div>
                <Heart size={12} className={friend.matchScore > 80 ? "text-primary fill-primary" : "text-muted-foreground"} />
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl glass text-destructive hover:bg-destructive/10 transition-all text-sm font-semibold"
        >
          <LogOut size={16} /> Sair da conta
        </button>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
