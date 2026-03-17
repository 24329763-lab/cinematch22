import { useState, useEffect, useCallback, useRef } from "react";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { MOVIE_POSTERS, type MoviePoster } from "@/lib/tmdb";

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

const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

function buildPosterUrl(movie: any): string {
  if (movie.posterUrl) return movie.posterUrl;
  if (movie.poster_path) return `${POSTER_BASE}${movie.poster_path}`;
  const slug = movie.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  if (MOVIE_POSTERS[slug]) return MOVIE_POSTERS[slug];
  return "/placeholder.svg";
}

export function usePersonalizedHome() {
  const { user } = useAuth();
  const [personalizedSections, setPersonalizedSections] = useState<PersonalizedSection[]>([]);
  const [tasteSummary, setTasteSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const inFlightRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  const fetchPersonalization = useCallback(async (force = false) => {
    if (!user || inFlightRef.current) {
      if (!user) setHasPersonalization(false);
      return;
    }

    // Throttle: don't re-fetch more than once per 5 minutes unless forced
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 5 * 60 * 1000 && hasPersonalization) {
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);
    try {
      const { data, error } = await lovable.functions.invoke("personalize", {
        body: {}
      });

      if (error) throw error;

      const personalizedData: PersonalizedHome = data;
      lastFetchRef.current = Date.now();

      if (personalizedData.sections && personalizedData.sections.length > 0) {
        const sections = personalizedData.sections.map((section) => ({
          ...section,
          movies: section.movies.map((m: any, i: number) => ({
            id: m.id || `p-${section.key}-${i}`,
            title: m.title,
            year: m.year,
            rating: m.rating,
            posterUrl: m.posterUrl || buildPosterUrl(m),
            platforms: m.platforms || ["netflix"],
            genres: m.genres || [],
            matchPercent: typeof m.matchPercent === "number" ? m.matchPercent : undefined,
            description: m.description,
          })),
        }));

        setPersonalizedSections(sections);
        setTasteSummary(personalizedData.taste_summary);
        setHasPersonalization(true);
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
  }, [user, hasPersonalization]);

  // Initial fetch
  useEffect(() => {
    fetchPersonalization();
  }, [user]);

  // Retry only if no personalization yet (max once per 30s)
  useEffect(() => {
    if (!user || hasPersonalization) return;
    const interval = setInterval(() => fetchPersonalization(), 30000);
    return () => clearInterval(interval);
  }, [user, hasPersonalization]);

  return {
    personalizedSections,
    tasteSummary,
    isLoading,
    hasPersonalization,
    refresh: () => fetchPersonalization(true),
  };
}
