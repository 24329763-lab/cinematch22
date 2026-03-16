import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Film, Heart, Users, LogOut, Copy, UserPlus, Check, X, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface FriendProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  favorite_genres: string[] | null;
}

interface Invite {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender_profile?: FriendProfile;
  receiver_profile?: FriendProfile;
}

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [friendCode, setFriendCode] = useState<string>("");
  const [inviteCode, setInviteCode] = useState("");
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadFriends();
    loadPendingInvites();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setProfile(data);
      setFriendCode(data.friend_code || "");
    }
  };

  const loadFriends = async () => {
    if (!user) return;
    // Get accepted invites where user is sender or receiver
    const { data: invites } = await supabase
      .from("friend_invites")
      .select("*")
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!invites || invites.length === 0) { setFriends([]); return; }

    const friendIds = invites.map((i: any) =>
      i.sender_id === user.id ? i.receiver_id : i.sender_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, favorite_genres")
      .in("user_id", friendIds);

    setFriends((profiles || []) as FriendProfile[]);
  };

  const loadPendingInvites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friend_invites")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    if (!data || data.length === 0) { setPendingInvites([]); return; }

    const senderIds = data.map((i: any) => i.sender_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, favorite_genres")
      .in("user_id", senderIds);

    const enriched = data.map((invite: any) => ({
      ...invite,
      sender_profile: profiles?.find((p: any) => p.user_id === invite.sender_id),
    }));

    setPendingInvites(enriched);
  };

  const copyFriendCode = () => {
    navigator.clipboard.writeText(friendCode);
    toast({ title: "Código copiado!" });
  };

  const sendInvite = async () => {
    if (!user || !inviteCode.trim()) return;
    setLoading(true);
    try {
      // Find profile by friend_code
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .eq("friend_code", inviteCode.toUpperCase().trim())
        .single();

      if (!targetProfile) {
        toast({ variant: "destructive", title: "Código não encontrado" });
        return;
      }

      if (targetProfile.user_id === user.id) {
        toast({ variant: "destructive", title: "Você não pode adicionar a si mesmo" });
        return;
      }

      const { error } = await supabase.from("friend_invites").insert({
        sender_id: user.id,
        receiver_id: targetProfile.user_id,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Convite já enviado!" });
        } else {
          toast({ variant: "destructive", title: "Erro ao enviar convite" });
        }
        return;
      }

      toast({ title: `Convite enviado para ${targetProfile.display_name || "usuário"}!` });
      setInviteCode("");
    } finally {
      setLoading(false);
    }
  };

  const respondInvite = async (inviteId: string, accept: boolean) => {
    await supabase
      .from("friend_invites")
      .update({ status: accept ? "accepted" : "rejected", updated_at: new Date().toISOString() })
      .eq("id", inviteId);

    loadPendingInvites();
    if (accept) loadFriends();
    toast({ title: accept ? "Conexão aceita!" : "Convite recusado" });
  };

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

        {/* Friend code */}
        {friendCode && (
          <div className="glass-surface rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus size={16} className="text-primary" />
              <h3 className="text-sm font-bold">Seu Código de Amizade</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-[0.3em] gradient-text">{friendCode}</span>
              <button onClick={copyFriendCode} className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground transition-all">
                <Copy size={16} />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Compartilhe com amigos para se conectarem</p>
          </div>
        )}

        {/* Add friend by code */}
        <div className="glass-surface rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-accent" />
            <h3 className="text-sm font-bold">Adicionar Conexão</h3>
          </div>
          <div className="flex gap-2">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Código do amigo"
              maxLength={6}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-4 py-2.5 rounded-xl glass focus:ring-1 focus:ring-primary/50 tracking-[0.2em] font-bold"
            />
            <button
              onClick={sendInvite}
              disabled={inviteCode.length < 4 || loading}
              className="px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold disabled:opacity-30 transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Enviar"}
            </button>
          </div>
        </div>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="glass-surface rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-cinema-gold" />
              <h3 className="text-sm font-bold">Convites Pendentes</h3>
            </div>
            <div className="space-y-2.5">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 p-3.5 rounded-xl glass">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {(invite.sender_profile?.display_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{invite.sender_profile?.display_name || "Alguém"}</p>
                    <p className="text-[11px] text-muted-foreground">quer se conectar</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => respondInvite(invite.id, true)} className="p-2 rounded-lg gradient-primary text-primary-foreground">
                      <Check size={14} />
                    </button>
                    <button onClick={() => respondInvite(invite.id, false)} className="p-2 rounded-lg glass text-muted-foreground hover:text-destructive">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
        {friends.length > 0 && (
          <div className="glass-surface rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-accent" />
              <h3 className="text-sm font-bold">Conexões ({friends.length})</h3>
            </div>
            <div className="space-y-2.5">
              {friends.map((friend) => (
                <div key={friend.user_id} className="flex items-center gap-3 p-3.5 rounded-xl glass">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {(friend.display_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{friend.display_name || "Usuário"}</p>
                    {friend.favorite_genres && friend.favorite_genres.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Curte: {friend.favorite_genres.slice(0, 3).join(", ")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/party/${friend.user_id}`)}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full gradient-primary text-primary-foreground"
                  >
                    🎉 Party
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
