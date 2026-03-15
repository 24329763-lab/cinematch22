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

// All posters stored locally in /public/posters/
const P = "/posters";

export const MOVIE_POSTERS: Record<string, string> = {
  "ainda-estou-aqui": `${P}/ainda-estou-aqui.jpg`,
  "cidade-de-deus": `${P}/cidade-de-deus.jpg`,
  "parasita": `${P}/parasita.jpg`,
  "whiplash": `${P}/whiplash.jpg`,
  "bacurau": `${P}/bacurau.jpg`,
  "tropa-de-elite": `${P}/tropa-de-elite.jpg`,
  "central-do-brasil": `${P}/central-do-brasil.jpg`,
  "o-auto-da-compadecida": `${P}/o-auto-da-compadecida.jpg`,
  "interestelar": `${P}/interestelar.jpg`,
  "clube-da-luta": `${P}/clube-da-luta.jpg`,
  "duna-2": `${P}/duna-2.jpg`,
  "oppenheimer": `${P}/oppenheimer.jpg`,
  "poor-things": `${P}/poor-things.jpg`,
  "nosferatu": `${P}/nosferatu.jpg`,
  "aquarius": `${P}/aquarius.jpg`,
  "o-som-ao-redor": `${P}/o-som-ao-redor.jpg`,
  "3-percent": `${P}/3-percent.jpg`,
  "blade-runner-2049": `${P}/blade-runner-2049.jpg`,
};

export const MOVIE_BACKDROPS: Record<string, string> = {
  "ainda-estou-aqui": `${P}/ainda-estou-aqui-backdrop.jpg`,
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
