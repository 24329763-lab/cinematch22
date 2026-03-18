import { useState, useEffect, useRef } from "react";
import type { MoviePoster } from "@/lib/tmdb";

const TMDB_CACHE_KEY = "cinematch_tmdb_fallback";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface TMDBSection {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  movies: MoviePoster[];
}

function loadTMDBCache(): TMDBSection[] | null {
  try {
    const raw = localStorage.getItem(TMDB_CACHE_KEY);
    if (!raw) return null;
    const { sections, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return sections;
  } catch {
    return null;
  }
}

export function useTMDBMovies() {
  const [sections, setSections] = useState<TMDBSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;

    const cached = loadTMDBCache();
    if (cached && cached.length > 0) {
      setSections(cached);
      fetchedRef.current = true;
      return;
    }

    const fetchMovies = async () => {
      setIsLoading(true);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/personalize`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!resp.ok) throw new Error("Failed");
        const data = await resp.json();
        if (data.sections && data.sections.length > 0) {
          const mapped: TMDBSection[] = data.sections.map((s: any) => ({
            key: s.key,
            title: s.title,
            subtitle: s.subtitle || "",
            icon: s.icon || "star",
            movies: (s.movies || []).map((m: any, i: number) => ({
              id: m.id || `tmdb-${i}`,
              title: m.title,
              year: m.year || 2024,
              rating: m.rating || 7,
              posterUrl: m.posterUrl || "/placeholder.svg",
              platforms: m.platforms || [],
              genres: m.genres || [],
              description: m.description || "",
            })),
          }));
          setSections(mapped);
          fetchedRef.current = true;
          try {
            localStorage.setItem(TMDB_CACHE_KEY, JSON.stringify({ sections: mapped, timestamp: Date.now() }));
          } catch {}
        }
      } catch (e) {
        console.error("TMDB fallback fetch error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, []);

  return { sections, isLoading };
}
