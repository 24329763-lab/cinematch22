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
      <AnimatePresence mode="wait">
        {showQuiz ? (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ ease: [0.2, 0.8, 0.2, 1] }}
          >
            {/* Quiz progress */}
            <div className="flex gap-1 mb-8">
              {QUIZ_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= quizStep ? "bg-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>

            <h2 className="text-xl font-bold tracking-display mb-1">
              {QUIZ_STEPS[quizStep].question}
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              {QUIZ_STEPS[quizStep].multiSelect
                ? "Selecione quantos quiser"
                : "Selecione uma opção"}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-8">
              {QUIZ_STEPS[quizStep].options.map((opt) => {
                const selected = currentSelections.includes(opt.label);
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelect(quizStep, opt.label)}
                    className={`flex items-center gap-2.5 p-3.5 rounded-xl text-sm font-medium transition-all text-left ${
                      selected
                        ? "bg-primary/15 ring-1 ring-primary text-foreground"
                        : "bg-secondary/50 text-secondary-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <span className="flex-1">{opt.label}</span>
                    {selected && <Check size={14} className="text-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              {quizStep > 0 && (
                <button
                  onClick={() => setQuizStep((s) => s - 1)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground"
                >
                  Voltar
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={currentSelections.length === 0}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
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
          >
            {/* Profile header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-3">
                <User size={32} className="text-muted-foreground" />
              </div>
              <h1 className="text-xl font-bold tracking-display">Seu Perfil</h1>
              <p className="text-sm text-muted-foreground">
                {quizComplete ? "Perfil completo ✓" : "Complete seu perfil para recomendações melhores"}
              </p>
            </div>

            {/* Quiz CTA */}
            {!quizComplete && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowQuiz(true)}
                className="w-full glass-surface rounded-2xl p-4 flex items-center gap-3 mb-6 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center cinema-glow">
                  <Zap size={18} className="text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Completar Perfil Cinéfilo</p>
                  <p className="text-xs text-muted-foreground">
                    5 perguntas rápidas para personalizar suas recomendações
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </motion.button>
            )}

            {/* Taste summary */}
            {quizComplete && (
              <div className="glass-surface rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Film size={16} className="text-primary" />
                  <h3 className="text-sm font-semibold">Seu Gosto</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(selections)
                    .flat()
                    .map((s) => (
                      <span
                        key={s}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-primary/10 text-primary"
                      >
                        {s}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Friends / Social */}
            <div className="glass-surface rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-accent" />
                  <h3 className="text-sm font-semibold">Conexões</h3>
                </div>
                <button className="text-xs text-primary font-medium">+ Adicionar</button>
              </div>

              {FRIENDS.length > 0 ? (
                <div className="space-y-2">
                  {FRIENDS.map((friend) => (
                    <button
                      key={friend.name}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground">
                        {friend.avatar}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{friend.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {friend.matchScore}% de compatibilidade
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart
                          size={12}
                          className={
                            friend.matchScore > 80
                              ? "text-primary fill-primary"
                              : "text-muted-foreground"
                          }
                        />
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          {friend.matchScore}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Conecte-se com amigos para ver compatibilidade
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
