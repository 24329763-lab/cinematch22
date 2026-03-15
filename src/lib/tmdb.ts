// Real movie poster URLs using media.themoviedb.org
const TMDB_POSTER = "https://media.themoviedb.org/t/p/w440_and_h660_face";
const TMDB_BACKDROP = "https://media.themoviedb.org/t/p/w1920_and_h800_multi_faces";

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
}

export const MOVIE_POSTERS: Record<string, string> = {
  "ainda-estou-aqui": `${TMDB_POSTER}/gZnsMbhCvhzAQlKaVpeFRHYjGyb.jpg`,
  "cidade-de-deus": `${TMDB_POSTER}/mOBGxp0e8GQ1yBMSJiZcHnNH1jz.jpg`,
  "parasita": `${TMDB_POSTER}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`,
  "whiplash": `${TMDB_POSTER}/7fn624j5lj3xTme2SgiLCeuedOS.jpg`,
  "bacurau": `${TMDB_POSTER}/1yEFzZEoBymHnBqpVDQVweYQQ7X.jpg`,
  "tropa-de-elite": `${TMDB_POSTER}/xr01CI15zlbCbDjGMYcxFP4fVvK.jpg`,
  "central-do-brasil": `${TMDB_POSTER}/kF3YGXV6R6KIc9mDzRHQthQYeVN.jpg`,
  "o-auto-da-compadecida": `${TMDB_POSTER}/tqMf7I8mhzl7UGEfrN0WyGwRBBb.jpg`,
  "interestelar": `${TMDB_POSTER}/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg`,
  "clube-da-luta": `${TMDB_POSTER}/pMhTgvaJCajAJPzEElBOsmI3Op6.jpg`,
  "duna-2": `${TMDB_POSTER}/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg`,
  "oppenheimer": `${TMDB_POSTER}/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg`,
  "poor-things": `${TMDB_POSTER}/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg`,
  "nosferatu": `${TMDB_POSTER}/pRAmSOGOeW5ybaMM4xxkYIpSi0n.jpg`,
  "aquarius": `${TMDB_POSTER}/s5gaCbWEKnhWuMzAyX6PnhDoCyb.jpg`,
  "o-som-ao-redor": `${TMDB_POSTER}/j5GqGvIqSe7IqKUXzDqcA0kFjaa.jpg`,
  "3-percent": `${TMDB_POSTER}/t3pKKfBDPUGIiASqtk44IG8kgth.jpg`,
  "blade-runner-2049": `${TMDB_POSTER}/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg`,
};

export const MOVIE_BACKDROPS: Record<string, string> = {
  "ainda-estou-aqui": `${TMDB_BACKDROP}/j9uruwRe9qM8RnP758dF7ISB8Bj.jpg`,
  "parasita": `${TMDB_BACKDROP}/TU9Lpz2U4ZiA1WpcnhmyMGMBYzn.jpg`,
  "interestelar": `${TMDB_BACKDROP}/xJHokMbljvjADYdit5fK5VQsXEG.jpg`,
  "duna-2": `${TMDB_BACKDROP}/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg`,
  "oppenheimer": `${TMDB_BACKDROP}/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg`,
};

export const TRENDING: MoviePoster[] = [
  { id: "t1", title: "Ainda Estou Aqui", year: 2024, rating: 8.1, posterUrl: MOVIE_POSTERS["ainda-estou-aqui"], platforms: ["netflix"], genres: ["Drama", "Histórico"], matchPercent: 96 },
  { id: "t2", title: "Nosferatu", year: 2024, rating: 7.8, posterUrl: MOVIE_POSTERS["nosferatu"], platforms: ["prime", "disney"], genres: ["Terror"] },
  { id: "t3", title: "Duna: Parte 2", year: 2024, rating: 8.1, posterUrl: MOVIE_POSTERS["duna-2"], platforms: ["prime"], genres: ["Ficção Científica"], matchPercent: 89 },
  { id: "t4", title: "Parasita", year: 2019, rating: 8.5, posterUrl: MOVIE_POSTERS["parasita"], platforms: ["netflix"], genres: ["Suspense"] },
  { id: "t5", title: "Oppenheimer", year: 2023, rating: 8.3, posterUrl: MOVIE_POSTERS["oppenheimer"], platforms: ["prime"], genres: ["Drama", "Biografia"] },
  { id: "t6", title: "Pobres Criaturas", year: 2023, rating: 7.9, posterUrl: MOVIE_POSTERS["poor-things"], platforms: ["disney"], genres: ["Comédia", "Drama"] },
];

export const FOR_YOU: MoviePoster[] = [
  { id: "f1", title: "Cidade de Deus", year: 2002, rating: 8.6, posterUrl: MOVIE_POSTERS["cidade-de-deus"], platforms: ["netflix"], genres: ["Crime", "Drama"], matchPercent: 94 },
  { id: "f2", title: "Bacurau", year: 2019, rating: 7.4, posterUrl: MOVIE_POSTERS["bacurau"], platforms: ["prime"], genres: ["Ação", "Suspense"], matchPercent: 91 },
  { id: "f3", title: "Central do Brasil", year: 1998, rating: 8.0, posterUrl: MOVIE_POSTERS["central-do-brasil"], platforms: ["prime"], genres: ["Drama"], matchPercent: 87 },
  { id: "f4", title: "Tropa de Elite", year: 2007, rating: 8.0, posterUrl: MOVIE_POSTERS["tropa-de-elite"], platforms: ["netflix"], genres: ["Ação", "Crime"], matchPercent: 85 },
  { id: "f5", title: "Aquarius", year: 2016, rating: 7.5, posterUrl: MOVIE_POSTERS["aquarius"], platforms: ["prime"], genres: ["Drama"], matchPercent: 82 },
  { id: "f6", title: "O Auto da Compadecida", year: 2000, rating: 8.3, posterUrl: MOVIE_POSTERS["o-auto-da-compadecida"], platforms: ["disney"], genres: ["Comédia"], matchPercent: 80 },
];

export const LEAVING_SOON: MoviePoster[] = [
  { id: "l1", title: "Parasita", year: 2019, rating: 8.5, posterUrl: MOVIE_POSTERS["parasita"], platforms: ["netflix"], genres: ["Suspense"] },
  { id: "l2", title: "Interestelar", year: 2014, rating: 8.7, posterUrl: MOVIE_POSTERS["interestelar"], platforms: ["prime"], genres: ["Ficção Científica"] },
  { id: "l3", title: "Whiplash", year: 2014, rating: 8.5, posterUrl: MOVIE_POSTERS["whiplash"], platforms: ["netflix"], genres: ["Drama"] },
  { id: "l4", title: "Clube da Luta", year: 1999, rating: 8.8, posterUrl: MOVIE_POSTERS["clube-da-luta"], platforms: ["disney"], genres: ["Drama", "Suspense"] },
];

export const NEW_RELEASES: MoviePoster[] = [
  { id: "n1", title: "Duna: Parte 2", year: 2024, rating: 8.1, posterUrl: MOVIE_POSTERS["duna-2"], platforms: ["prime"], genres: ["Ficção Científica"] },
  { id: "n2", title: "Oppenheimer", year: 2023, rating: 8.3, posterUrl: MOVIE_POSTERS["oppenheimer"], platforms: ["prime"], genres: ["Drama"] },
  { id: "n3", title: "Pobres Criaturas", year: 2023, rating: 7.9, posterUrl: MOVIE_POSTERS["poor-things"], platforms: ["disney"], genres: ["Comédia"] },
  { id: "n4", title: "Nosferatu", year: 2024, rating: 7.8, posterUrl: MOVIE_POSTERS["nosferatu"], platforms: ["prime"], genres: ["Terror"] },
  { id: "n5", title: "Blade Runner 2049", year: 2017, rating: 8.0, posterUrl: MOVIE_POSTERS["blade-runner-2049"], platforms: ["netflix"], genres: ["Ficção Científica"] },
];

export const NETFLIX_ORIGINALS: MoviePoster[] = [
  { id: "no1", title: "Ainda Estou Aqui", year: 2024, rating: 8.1, posterUrl: MOVIE_POSTERS["ainda-estou-aqui"], platforms: ["netflix"], genres: ["Drama"] },
  { id: "no2", title: "3%", year: 2024, rating: 7.2, posterUrl: MOVIE_POSTERS["3-percent"], platforms: ["netflix"], genres: ["Ficção Científica"] },
  { id: "no3", title: "Cidade de Deus", year: 2002, rating: 8.6, posterUrl: MOVIE_POSTERS["cidade-de-deus"], platforms: ["netflix"], genres: ["Crime"] },
  { id: "no4", title: "Tropa de Elite", year: 2007, rating: 8.0, posterUrl: MOVIE_POSTERS["tropa-de-elite"], platforms: ["netflix"], genres: ["Ação"] },
  { id: "no5", title: "O Som ao Redor", year: 2012, rating: 7.3, posterUrl: MOVIE_POSTERS["o-som-ao-redor"], platforms: ["netflix"], genres: ["Suspense"] },
];
