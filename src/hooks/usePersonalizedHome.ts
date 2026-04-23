import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type MoviePoster } from "@/lib/tmdb";

interface PersonalizedSection {
  key: string;
  title: string;
  subtitle?: string;
  icon: string;
  movies: MoviePoster[];
}

interface PersonalizedHome {
  sections: PersonalizedSection[];
  taste_summary: string | null;
}

const CACHE_KEY = "cinematch_home_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedHome {
  sections: PersonalizedSection[];
  tasteSummary: string | null;
  timestamp: number;
  tasteBioHash: string;
}

function hashString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function loadCache(userId: string): CachedHome | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${userId}`);
    if (!raw) return null;
    const cached: CachedHome = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function saveCache(userId: string, data: CachedHome) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

export function usePersonalizedHome() {
  const { user, profile } = useAuth();
  const [personalizedSections, setPersonalizedSections] = useState<PersonalizedSection[]>([]);
  const [tasteSummary, setTasteSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const inFlightRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const fetchPersonalization = useCallback(async (force = false) => {
    if (!user || inFlightRef.current) return;

    const tasteBioHash = hashString(profile?.taste_bio || "");

    // Check localStorage cache first (unless forced)
    if (!force) {
      const cached = loadCache(user.id);
      if (cached && cached.tasteBioHash === tasteBioHash && cached.sections.length > 0) {
        setPersonalizedSections(cached.sections);
        setTasteSummary(cached.tasteSummary);
        setHasPersonalization(true);
        hasFetchedRef.current = true;
        return;
      }
    }

    inFlightRef.current = true;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<PersonalizedHome>("personalize", {
        body: {},
      });

      if (error || !data) throw error || new Error("Personalization failed");

      if (data.sections && data.sections.length > 0) {
        const sections = data.sections.map((section) => ({
          ...section,
          movies: section.movies.map((m: any, i: number) => ({
            id: m.id || `p-${section.key}-${i}`,
            title: m.title,
            year: m.year,
            rating: m.rating,
            posterUrl: m.posterUrl || "/placeholder.svg",
            platforms: m.platforms || [],
            genres: m.genres || [],
            matchPercent: typeof m.matchPercent === "number" ? m.matchPercent : undefined,
            description: m.description,
          })),
        }));

        setPersonalizedSections(sections);
        setTasteSummary(data.taste_summary);
        setHasPersonalization(true);
        hasFetchedRef.current = true;

        // Save to localStorage cache
        saveCache(user.id, {
          sections,
          tasteSummary: data.taste_summary,
          timestamp: Date.now(),
          tasteBioHash,
        });
      } else {
        setHasPersonalization(false);
      }
    } catch (e) {
      console.error("Personalization error:", e);
      setHasPersonalization(false);
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [user, profile?.taste_bio]);

  // Fetch once on mount or when taste_bio changes significantly
  useEffect(() => {
    if (!user || hasFetchedRef.current) return;
    fetchPersonalization();
  }, [user]);

  // Re-fetch when taste_bio changes (force)
  useEffect(() => {
    if (!user || !profile?.taste_bio) return;
    const cached = loadCache(user.id);
    const currentHash = hashString(profile.taste_bio || "");
    if (cached && cached.tasteBioHash !== currentHash) {
      fetchPersonalization(true);
    }
  }, [profile?.taste_bio]);

  return {
    personalizedSections,
    tasteSummary,
    isLoading,
    hasPersonalization,
    refresh: () => fetchPersonalization(true),
  };
}
