import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const { user, profile } = useAuth();
  const [personalizedSections, setPersonalizedSections] = useState<PersonalizedSection[]>([]);
  const [tasteSummary, setTasteSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const inFlightRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const fetchAttemptsRef = useRef<number>(0);

  const fetchPersonalization = useCallback(
    async (force = false) => {
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
      fetchAttemptsRef.current += 1; // Increment attempt counter

      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        if (!token) {
          setHasPersonalization(false);
          return;
        }

        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/personalize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ user_id: user.id }), // Pass user_id explicitly
        });

        if (!resp.ok) throw new Error("Personalization failed");

        const data: PersonalizedSection[] = await resp.json(); // Expecting array of sections directly

        lastFetchRef.current = Date.now();

        if (data && data.length > 0) {
          const sections = data.map((section) => ({
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
          // The taste_summary is now part of the profile, not returned by personalize function
          setTasteSummary(profile?.taste_bio || null);
          setHasPersonalization(true);
          fetchAttemptsRef.current = 0; // Reset attempts on success
        } else {
          setPersonalizedSections([]);
          setTasteSummary(profile?.taste_bio || null);
          setHasPersonalization(false);
        }
      } catch (e) {
        console.error("Personalization error:", e);
        setPersonalizedSections([]);
        setTasteSummary(profile?.taste_bio || null);
        setHasPersonalization(false);
      } finally {
        inFlightRef.current = false;
        setIsLoading(false);
      }
    },
    [user, profile?.taste_bio, hasPersonalization],
  );

  // Initial fetch and fetch when taste_bio changes
  useEffect(() => {
    if (user) {
      fetchPersonalization(true); // Force fetch on user or profile change
    }
  }, [user, profile?.taste_bio, fetchPersonalization]);

  // Retry only if no personalization yet, but with a backoff
  useEffect(() => {
    if (!user || hasPersonalization || fetchAttemptsRef.current >= 5) return; // Limit retries

    const timeout = setTimeout(
      () => {
        fetchPersonalization();
      },
      Math.min(fetchAttemptsRef.current * 5000, 30000),
    ); // Exponential backoff up to 30s

    return () => clearTimeout(timeout);
  }, [user, hasPersonalization, fetchPersonalization]);

  return {
    personalizedSections,
    tasteSummary,
    isLoading,
    hasPersonalization,
    refresh: () => fetchPersonalization(true),
  };
}
