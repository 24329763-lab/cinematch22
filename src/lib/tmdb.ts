export interface MoviePoster {
  id: string;
  title: string;
  year: number;
  rating: number;
  posterUrl: string;
  backdropUrl?: string;
  platforms: ("netflix" | "prime" | "disney")[];
  genres: string[];
  matchPercent?: number;
  description?: string;
  tmdbId?: number;
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

// --- KEEPING THESE FOR COMPATIBILITY ---
export const MOVIE_POSTERS: Record<string, string> = {
  placeholder: "/placeholder.svg",
};

export const TRENDING: MoviePoster[] = [
  {
    id: "t1",
    title: "Ainda Estou Aqui",
    year: 2024,
    rating: 8.1,
    posterUrl: "https://image.tmdb.org/t/p/w500/ainda-estou-aqui.jpg",
    platforms: ["netflix"],
    genres: ["Drama"],
    description:
      "Eunice Paiva reconstrói a vida após o desaparecimento do marido durante a ditadura militar brasileira.",
  },
];

export const FOR_YOU: MoviePoster[] = [...TRENDING];
export const LEAVING_SOON: MoviePoster[] = [...TRENDING];
export const NEW_RELEASES: MoviePoster[] = [...TRENDING];
export const NETFLIX_ORIGINALS: MoviePoster[] = [...TRENDING];
// ---------------------------------------

// Dynamic TMDB fetching functions
export async function fetchTrendingMovies(): Promise<MoviePoster[]> {
  try {
    const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
    if (!TMDB_API_KEY) return TRENDING;

    const url = `${TMDB_BASE}/trending/movie/week?api_key=${TMDB_API_KEY}&language=pt-BR`;
    const resp = await fetch(url);
    const data = await resp.json();

    return (data.results || []).slice(0, 6).map((movie: any) => ({
      id: `tmdb-${movie.id}`,
      title: movie.title,
      year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 2024,
      rating: movie.vote_average ? movie.vote_average / 2 : 7.5,
      posterUrl: movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : "/placeholder.svg",
      platforms: ["netflix"],
      genres: [],
      description: movie.overview,
      tmdbId: movie.id,
    }));
  } catch (e) {
    console.error("Error fetching trending movies:", e);
    return TRENDING;
  }
}

export async function fetchPopularMovies(): Promise<MoviePoster[]> {
  try {
    const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
    if (!TMDB_API_KEY) return FOR_YOU;

    const url = `${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=pt-BR`;
    const resp = await fetch(url);
    const data = await resp.json();

    return (data.results || []).slice(0, 6).map((movie: any) => ({
      id: `tmdb-${movie.id}`,
      title: movie.title,
      year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 2024,
      rating: movie.vote_average ? movie.vote_average / 2 : 7.5,
      posterUrl: movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : "/placeholder.svg",
      platforms: ["netflix"],
      genres: [],
      description: movie.overview,
      tmdbId: movie.id,
    }));
  } catch (e) {
    console.error("Error fetching popular movies:", e);
    return FOR_YOU;
  }
}
