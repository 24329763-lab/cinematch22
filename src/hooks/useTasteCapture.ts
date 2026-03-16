import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCallback } from "react";

type SignalType = "like" | "dislike" | "preference" | "interest" | "avoid";
type Category = "genre" | "movie" | "mood" | "era" | "director" | "actor" | "theme" | "style";

interface TasteSignal {
  signal_type: SignalType;
  category: Category;
  value: string;
  confidence?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

export function useTasteCapture() {
  const { user } = useAuth();

  const captureSignal = useCallback(async (signal: TasteSignal) => {
    if (!user) return;
    await supabase.from("taste_signals" as any).insert({
      user_id: user.id,
      signal_type: signal.signal_type,
      category: signal.category,
      value: signal.value,
      confidence: signal.confidence ?? 0.7,
      source: signal.source ?? "interaction",
      metadata: signal.metadata ?? {},
    });
  }, [user]);

  const captureWatchlistAdd = useCallback(async (title: string, genres: string[]) => {
    if (!user) return;
    // Movie interest signal
    await captureSignal({ signal_type: "interest", category: "movie", value: title, confidence: 0.8, source: "watchlist" });
    // Genre signals
    for (const genre of genres) {
      await captureSignal({ signal_type: "like", category: "genre", value: genre, confidence: 0.6, source: "watchlist" });
    }
  }, [user, captureSignal]);

  const captureRating = useCallback(async (title: string, rating: number, genres: string[]) => {
    if (!user) return;
    const isPositive = rating >= 7;
    const isNegative = rating <= 4;
    
    if (isPositive) {
      await captureSignal({ signal_type: "like", category: "movie", value: title, confidence: 0.9, source: "rating", metadata: { rating } });
      for (const genre of genres) {
        await captureSignal({ signal_type: "like", category: "genre", value: genre, confidence: 0.7, source: "rating" });
      }
    } else if (isNegative) {
      await captureSignal({ signal_type: "dislike", category: "movie", value: title, confidence: 0.9, source: "rating", metadata: { rating } });
      for (const genre of genres) {
        await captureSignal({ signal_type: "avoid", category: "genre", value: genre, confidence: 0.4, source: "rating" });
      }
    }
  }, [user, captureSignal]);

  return { captureSignal, captureWatchlistAdd, captureRating };
}
