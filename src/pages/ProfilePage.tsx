import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { User, Film, Heart, Users, LogOut, Copy, UserPlus, Check, X, Loader2, Sparkles, RefreshCw, Share2, Pencil, MessageCircle, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface FriendProfile {
  user_id: string;
  display_name: string | null;
  nickname: string | null;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [friendCode, setFriendCode] = useState<string>("");
  const [inviteCode, setInviteCode] = useState("");
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [changingCode, setChangingCode] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [tasteBio, setTasteBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [tasteSummary, setTasteSummary] = useState<string | null>(null);
  // Nickname
  const [nickname, setNickname] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);
  // Display name
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadFriends();
    loadPendingInvites();
    loadTasteSummary();
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
      setFriendCode((data as any).friend_code || "");
      setTasteBio((data as any).taste_bio || "");
      setNickname((data as any).nickname || "");
      setAvatarUrl((data as any).avatar_url || null);
    }
  };

  const loadTasteSummary = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("home_recommendations")
      .select("taste_summary")
      .eq("user_id", user.id)
      .single();
    if (data?.taste_summary) {
      setTasteSummary(data.taste_summary);
    }
  };

  const loadFriends = async () => {
    if (!user) return;
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
      .select("user_id, display_name, nickname, avatar_url, favorite_genres")
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
      .select("user_id, display_name, nickname, avatar_url, favorite_genres")
      .in("user_id", senderIds);

    const enriched = data.map((invite: any) => ({
      ...invite,
      sender_profile: profiles?.find((p: any) => p.user_id === invite.sender_id),
    }));

    setPendingInvites(enriched);
  };

  const copyFriendCode = () => {
    navigator.clipboard.writeText(nickname || friendCode);
    toast({ title: "Código copiado!" });
  };

  const shareFriendCode = async () => {
    const code = nickname || friendCode;
    const shareData = {
      title: "Me adicione no CineMatch!",
      text: `Use meu código de amizade: ${code}`,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      copyFriendCode();
    }
  };

  const regenerateCode = async () => {
    if (!user) return;
    setChangingCode(true);
    try {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let newCode = "";
      for (let i = 0; i < 6; i++) {
        newCode += chars[Math.floor(Math.random() * chars.length)];
      }
      
      const { error } = await supabase
        .from("profiles")
        .update({ friend_code: newCode } as any)
        .eq("user_id", user.id);
      
      if (error) {
        toast({ variant: "destructive", title: "Tente novamente" });
      } else {
        setFriendCode(newCode);
        toast({ title: "Código atualizado!" });
      }
    } finally {
      setChangingCode(false);
    }
  };

  const saveCustomCode = async () => {
    if (!user || customCode.length < 4) return;
    setChangingCode(true);
    try {
      const code = customCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      const { error } = await supabase
        .from("profiles")
        .update({ friend_code: code } as any)
        .eq("user_id", user.id);
      
      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "Esse código já está em uso" });
        } else {
          toast({ variant: "destructive", title: "Erro ao salvar código" });
        }
      } else {
        setFriendCode(code);
        setEditingCode(false);
        setCustomCode("");
        toast({ title: "Código personalizado salvo!" });
      }
    } finally {
      setChangingCode(false);
    }
  };

  const saveTasteBio = async () => {
    if (!user) return;
    setSavingBio(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ taste_bio: tasteBio } as any)
        .eq("user_id", user.id);
      if (error) {
        toast({ variant: "destructive", title: "Erro ao salvar" });
      } else {
        setEditingBio(false);
        toast({ title: "Perfil de gosto atualizado!" });
      }
    } finally {
      setSavingBio(false);
    }
  };

  const saveNickname = async () => {
    if (!user) return;
    setSavingNickname(true);
    try {
      const cleaned = nicknameInput.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
      if (cleaned.length < 3) {
        toast({ variant: "destructive", title: "Mínimo 3 caracteres" });
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ nickname: cleaned } as any)
        .eq("user_id", user.id);
      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "Esse nickname já está em uso" });
        } else {
          toast({ variant: "destructive", title: "Erro ao salvar nickname" });
        }
      } else {
        setNickname(cleaned);
        setEditingNickname(false);
        toast({ title: "Nickname salvo!" });
      }
    } finally {
      setSavingNickname(false);
    }
  };

  const saveDisplayName = async () => {
    if (!user || !displayNameInput.trim()) return;
    setSavingDisplayName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayNameInput.trim() } as any)
        .eq("user_id", user.id);
      if (error) {
        toast({ variant: "destructive", title: "Erro ao salvar nome" });
      } else {
        setProfile((p: any) => ({ ...p, display_name: displayNameInput.trim() }));
        setEditingDisplayName(false);
        toast({ title: "Nome atualizado!" });
      }
    } finally {
      setSavingDisplayName(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      
      if (uploadError) {
        toast({ variant: "destructive", title: "Erro ao enviar foto" });
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl } as any)
        .eq("user_id", user.id);
      
      if (!updateError) {
        setAvatarUrl(publicUrl);
        toast({ title: "Foto atualizada!" });
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const sendInvite = async () => {
    if (!user || !inviteCode.trim()) return;
    setLoading(true);
    try {
      const codeToSearch = inviteCode.trim();
      
      // Search by friend_code OR nickname
      const { data: targetProfiles, error: lookupError } = await (supabase
        .from("profiles")
        .select("user_id, display_name, nickname") as any)
        .or(`friend_code.eq.${codeToSearch.toUpperCase()},nickname.eq.${codeToSearch.toLowerCase()}`);

      if (lookupError) {
        toast({ variant: "destructive", title: "Erro ao buscar código" });
        return;
      }

      const targetProfile = (targetProfiles || [])[0] as { user_id: string; display_name: string | null; nickname: string | null } | undefined;

      if (!targetProfile) {
        toast({ variant: "destructive", title: "Código não encontrado", description: `Nenhum usuário com o código "${codeToSearch}"` });
        return;
      }

      if (targetProfile.user_id === user.id) {
        toast({ variant: "destructive", title: "Você não pode adicionar a si mesmo" });
        return;
      }

      const { data: existing } = await supabase
        .from("friend_invites")
        .select("id, status")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetProfile.user_id}),and(sender_id.eq.${targetProfile.user_id},receiver_id.eq.${user.id})`);

      if (existing && existing.length > 0) {
        const inv = existing[0];
        if (inv.status === "accepted") {
          toast({ title: "Vocês já são amigos!" });
        } else if (inv.status === "pending") {
          toast({ title: "Convite já enviado!" });
        } else {
          await supabase.from("friend_invites").delete().eq("id", inv.id);
        }
        if (inv.status !== "rejected") return;
      }

      const { error } = await supabase.from("friend_invites").insert({
        sender_id: user.id,
        receiver_id: targetProfile.user_id,
      });

      if (error) {
        toast({ variant: "destructive", title: "Erro ao enviar convite" });
        return;
      }

      toast({ title: `Convite enviado para ${targetProfile.nickname || targetProfile.display_name || "usuário"}!` });
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
          <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center overflow-hidden cinema-glow">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={36} className="text-primary-foreground" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? <Loader2 size={20} className="animate-spin text-foreground" /> : <Camera size={20} className="text-foreground" />}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* Display name */}
          {editingDisplayName ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Seu nome"
                className="bg-transparent text-xl font-black text-center text-foreground outline-none border-b border-primary/40 pb-1 w-48"
                autoFocus
              />
              <button onClick={saveDisplayName} disabled={savingDisplayName} className="p-1 text-primary">
                {savingDisplayName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button onClick={() => setEditingDisplayName(false)} className="p-1 text-muted-foreground"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => { setDisplayNameInput(profile?.display_name || ""); setEditingDisplayName(true); }}
              className="flex items-center gap-1.5 group"
            >
              <h1 className="text-2xl font-black tracking-display">{profile?.display_name || "Seu Nome"}</h1>
              <Pencil size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          {/* Nickname */}
          {editingNickname ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">@</span>
              <input
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                placeholder="seunickname"
                maxLength={20}
                className="bg-transparent text-sm text-foreground outline-none border-b border-primary/40 pb-0.5 w-36"
                autoFocus
              />
              <button onClick={saveNickname} disabled={savingNickname} className="p-1 text-primary">
                {savingNickname ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              </button>
              <button onClick={() => setEditingNickname(false)} className="p-1 text-muted-foreground"><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => { setNicknameInput(nickname); setEditingNickname(true); }}
              className="flex items-center gap-1 mt-1 group"
            >
              <span className="text-sm text-muted-foreground">
                {nickname ? `@${nickname}` : "Toque para criar um @nickname"}
              </span>
              <Pencil size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
          {nickname && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Amigos podem te encontrar por @{nickname}</p>
          )}
        </div>

        {/* Taste Profile Card */}
        <div className="glass-surface rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-cinema-gold" />
              <h3 className="text-sm font-bold">Meu Perfil de Gosto</h3>
            </div>
            {!editingBio && (
              <button onClick={() => setEditingBio(true)} className="p-1.5 rounded-lg glass text-muted-foreground hover:text-foreground transition-all">
                <Pencil size={12} />
              </button>
            )}
          </div>

          {editingBio ? (
            <div className="space-y-3">
              <textarea
                value={tasteBio}
                onChange={(e) => setTasteBio(e.target.value)}
                placeholder="Descreva o que você curte: gêneros, moods, diretores, o que te irrita em filmes... Isso ajuda nas recomendações!"
                rows={4}
                maxLength={500}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-4 py-3 rounded-xl glass focus:ring-1 focus:ring-primary/50 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{tasteBio.length}/500</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingBio(false); setTasteBio((profile as any)?.taste_bio || ""); }}
                    className="px-3 py-1.5 rounded-lg glass text-muted-foreground text-xs font-semibold hover:text-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveTasteBio}
                    disabled={savingBio}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-bold disabled:opacity-30"
                  >
                    {savingBio ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {tasteBio ? (
                <p className="text-sm text-foreground/80 leading-relaxed">{tasteBio}</p>
              ) : tasteSummary ? (
                <p className="text-sm text-foreground/80 leading-relaxed italic">{tasteSummary}</p>
              ) : (
                <button
                  onClick={() => setEditingBio(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Toque para descrever seu gosto em filmes — isso melhora suas recomendações ✨
                </button>
              )}
              {tasteBio && (
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <MessageCircle size={10} /> Converse no chat para refinar seu perfil
                </p>
              )}
            </div>
          )}
        </div>

        {/* AI-generated taste summary */}
        {tasteSummary && tasteBio && (
          <div className="glass rounded-2xl p-4 mb-6 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <Sparkles size={12} className="text-primary-foreground" />
            </div>
            <div>
              <span className="text-[10px] font-bold gradient-text uppercase tracking-wider">O que o CineMatch entende</span>
              <p className="text-xs text-foreground/70 mt-0.5 leading-relaxed">{tasteSummary}</p>
            </div>
          </div>
        )}

        {/* Friend code */}
        {friendCode && (
          <div className="glass-surface rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus size={16} className="text-primary" />
              <h3 className="text-sm font-bold">Seu Código de Amizade</h3>
            </div>
            
            {editingCode ? (
              <div className="space-y-3">
                <input
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="Novo código (4-8 caracteres)"
                  maxLength={8}
                  className="w-full bg-transparent text-lg text-foreground placeholder:text-muted-foreground outline-none px-4 py-2.5 rounded-xl glass focus:ring-1 focus:ring-primary/50 tracking-[0.2em] font-bold"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveCustomCode}
                    disabled={customCode.length < 4 || changingCode}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold disabled:opacity-30"
                  >
                    {changingCode ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Salvar
                  </button>
                  <button
                    onClick={() => { setEditingCode(false); setCustomCode(""); }}
                    className="px-4 py-2.5 rounded-xl glass text-muted-foreground text-sm font-semibold hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black tracking-[0.3em] gradient-text">{nickname || friendCode}</span>
                  <div className="flex gap-1">
                    <button onClick={copyFriendCode} className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground transition-all" title="Copiar">
                      <Copy size={16} />
                    </button>
                    <button onClick={shareFriendCode} className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground transition-all" title="Compartilhar">
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={() => setEditingCode(true)} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-all">
                    <Pencil size={12} /> Personalizar código
                  </button>
                  <button onClick={regenerateCode} disabled={changingCode} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-all">
                    {changingCode ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Gerar novo
                  </button>
                </div>
              </>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              {nickname ? `Amigos podem usar @${nickname} ou o código acima` : "Compartilhe com amigos para se conectarem"}
            </p>
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
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Código ou @nickname"
              maxLength={20}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-4 py-2.5 rounded-xl glass focus:ring-1 focus:ring-primary/50 font-bold"
            />
            <button
              onClick={sendInvite}
              disabled={inviteCode.length < 3 || loading}
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
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden">
                    {invite.sender_profile?.avatar_url ? (
                      <img src={invite.sender_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (invite.sender_profile?.display_name || "?")[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{invite.sender_profile?.nickname ? `@${invite.sender_profile.nickname}` : invite.sender_profile?.display_name || "Alguém"}</p>
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
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (friend.display_name || "?")[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{friend.nickname ? `@${friend.nickname}` : friend.display_name || "Usuário"}</p>
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
