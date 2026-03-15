import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, ChevronRight, Film, Heart, Zap, Users, Check } from "lucide-react";

type QuizStep = {
  question: string;
  options: { label: string; emoji: string }[];
  multiSelect?: boolean;
};

const QUIZ_STEPS: QuizStep[] = [
  {
    question: "Quais gêneros você mais curte?",
    options: [
      { label: "Terror", emoji: "👻" },
      { label: "Drama", emoji: "🎭" },
      { label: "Comédia", emoji: "😂" },
      { label: "Ação", emoji: "💥" },
      { label: "Ficção Científica", emoji: "🚀" },
      { label: "Romance", emoji: "💕" },
      { label: "Documentário", emoji: "📹" },
      { label: "Suspense", emoji: "🔍" },
    ],
    multiSelect: true,
  },
  {
    question: "Qual era de cinema você prefere?",
    options: [
      { label: "Clássicos (antes de 1980)", emoji: "🎞️" },
      { label: "Anos 80/90", emoji: "📼" },
      { label: "Anos 2000/2010", emoji: "💿" },
      { label: "Lançamentos recentes", emoji: "✨" },
    ],
  },
  {
    question: "Cinema brasileiro ou internacional?",
    options: [
      { label: "Prefiro brasileiro", emoji: "🇧🇷" },
      { label: "Prefiro internacional", emoji: "🌍" },
      { label: "Tanto faz", emoji: "🤝" },
    ],
  },
  {
    question: "Qual clima você busca nos filmes?",
    options: [
      { label: "Tenso e sombrio", emoji: "🌑" },
      { label: "Leve e divertido", emoji: "☀️" },
      { label: "Reflexivo e profundo", emoji: "🧠" },
      { label: "Épico e grandioso", emoji: "⚡" },
    ],
  },
  {
    question: "Quais plataformas você assina?",
    options: [
      { label: "Netflix", emoji: "🔴" },
      { label: "Prime Video", emoji: "🟡" },
      { label: "Disney+", emoji: "🔵" },
    ],
    multiSelect: true,
  },
];

const FRIENDS = [
  { name: "João", matchScore: 87, avatar: "J" },
  { name: "Maria", matchScore: 72, avatar: "M" },
  { name: "Pedro", matchScore: 64, avatar: "P" },
];

const ProfilePage = () => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [selections, setSelections] = useState<Record<number, string[]>>({});
  const [quizComplete, setQuizComplete] = useState(false);

  const handleSelect = (stepIdx: number, option: string) => {
    const step = QUIZ_STEPS[stepIdx];
    setSelections((prev) => {
      const current = prev[stepIdx] || [];
      if (step.multiSelect) {
        return {
          ...prev,
          [stepIdx]: current.includes(option)
            ? current.filter((o) => o !== option)
            : [...current, option],
        };
      }
      return { ...prev, [stepIdx]: [option] };
    });
  };

  const handleNext = () => {
    if (quizStep < QUIZ_STEPS.length - 1) {
      setQuizStep((s) => s + 1);
    } else {
      setQuizComplete(true);
      setShowQuiz(false);
    }
  };

  const currentSelections = selections[quizStep] || [];

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-y-auto px-4 pt-8 pb-24">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-20 right-0 w-48 h-48 rounded-full bg-primary/5 blur-[80px]" />
        <div className="absolute bottom-40 left-0 w-48 h-48 rounded-full bg-accent/5 blur-[80px]" />
      </div>

      <AnimatePresence mode="wait">
        {showQuiz ? (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-md mx-auto"
          >
            {/* Progress */}
            <div className="flex gap-1.5 mb-8">
              {QUIZ_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    i <= quizStep ? "gradient-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>

            <h2 className="text-2xl font-black tracking-display mb-1">
              {QUIZ_STEPS[quizStep].question}
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              {QUIZ_STEPS[quizStep].multiSelect ? "Selecione quantos quiser" : "Selecione uma opção"}
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-8">
              {QUIZ_STEPS[quizStep].options.map((opt) => {
                const selected = currentSelections.includes(opt.label);
                return (
                  <motion.button
                    key={opt.label}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelect(quizStep, opt.label)}
                    className={`flex items-center gap-2.5 p-4 rounded-2xl text-sm font-medium transition-all text-left ${
                      selected
                        ? "glass-surface ring-1 ring-primary text-foreground"
                        : "glass text-foreground/70 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <span className="flex-1">{opt.label}</span>
                    {selected && <Check size={14} className="text-primary" />}
                  </motion.button>
                );
              })}
            </div>

            <div className="flex gap-3">
              {quizStep > 0 && (
                <button
                  onClick={() => setQuizStep((s) => s - 1)}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold glass text-foreground"
                >
                  Voltar
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={currentSelections.length === 0}
                className="flex-1 py-3 rounded-2xl text-sm font-bold gradient-primary text-primary-foreground disabled:opacity-30 transition-opacity cinema-glow-sm"
              >
                {quizStep === QUIZ_STEPS.length - 1 ? "Concluir" : "Próximo"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto"
          >
            {/* Profile header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mb-4 cinema-glow">
                <User size={36} className="text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-black tracking-display">Seu Perfil</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {quizComplete ? "Perfil completo ✓" : "Complete seu perfil para recomendações melhores"}
              </p>
            </div>

            {/* Quiz CTA */}
            {!quizComplete && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowQuiz(true)}
                className="w-full glass-surface rounded-2xl p-5 flex items-center gap-4 mb-6 group"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center cinema-glow-sm">
                  <Zap size={20} className="text-primary-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold">Completar Perfil Cinéfilo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    5 perguntas rápidas para personalizar tudo
                  </p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.button>
            )}

            {/* Taste summary */}
            {quizComplete && (
              <div className="glass-surface rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Film size={16} className="text-primary" />
                  <h3 className="text-sm font-bold">Seu Gosto</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.values(selections).flat().map((s) => (
                    <span key={s} className="text-[11px] font-semibold px-3 py-1.5 rounded-full gradient-primary text-primary-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Friends */}
            <div className="glass-surface rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-accent" />
                  <h3 className="text-sm font-bold">Conexões</h3>
                </div>
                <button className="text-xs text-primary font-semibold">+ Adicionar</button>
              </div>

              <div className="space-y-2.5">
                {FRIENDS.map((friend) => (
                  <motion.button
                    key={friend.name}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl glass hover:bg-white/10 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {friend.avatar}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold">{friend.name}</p>
                      <p className="text-[11px] text-muted-foreground">{friend.matchScore}% de compatibilidade</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Heart
                        size={12}
                        className={friend.matchScore > 80 ? "text-primary fill-primary" : "text-muted-foreground"}
                      />
                      <span className="text-xs font-bold tabular-nums text-muted-foreground">
                        {friend.matchScore}%
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
