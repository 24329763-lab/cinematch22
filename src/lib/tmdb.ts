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
  { id: "t1", title: "Ainda Estou Aqui", year: 2024, rating: 8.1, posterUrl: MOVIE_POSTERS["ainda-estou-aqui"], platforms: ["netflix"], genres: ["Drama", "Histórico"], description: "Eunice Paiva reconstrói a vida após o desaparecimento do marido durante a ditadura militar brasileira. Uma história de resiliência e memória que atravessa décadas." },
  { id: "t2", title: "Nosferatu", year: 2024, rating: 7.8, posterUrl: MOVIE_POSTERS["nosferatu"], platforms: ["prime", "disney"], genres: ["Terror"], description: "Reimaginação gótica do clássico vampiro. Uma jovem atormentada por uma criatura sobrenatural que a persegue desde a infância." },
  { id: "t3", title: "Duna: Parte 2", year: 2024, rating: 8.1, posterUrl: MOVIE_POSTERS["duna-2"], platforms: ["prime"], genres: ["Ficção Científica"], description: "Paul Atreides se une aos Fremen para vingar sua família, enfrentando uma escolha entre o amor e o destino do universo." },
  { id: "t4", title: "Parasita", year: 2019, rating: 8.5, posterUrl: MOVIE_POSTERS["parasita"], platforms: ["netflix"], genres: ["Suspense"], description: "Uma família pobre se infiltra na vida de uma família rica, desencadeando uma série de eventos imprevisíveis. Vencedor do Oscar de Melhor Filme." },
  { id: "t5", title: "Oppenheimer", year: 2023, rating: 8.3, posterUrl: MOVIE_POSTERS["oppenheimer"], platforms: ["prime"], genres: ["Drama", "Biografia"], description: "A história do homem que liderou o Projeto Manhattan e criou a bomba atômica, enfrentando as consequências morais de sua invenção." },
  { id: "t6", title: "Pobres Criaturas", year: 2023, rating: 7.9, posterUrl: MOVIE_POSTERS["poor-things"], platforms: ["disney"], genres: ["Comédia", "Drama"], description: "Bella Baxter, ressuscitada por um cientista excêntrico, embarca numa jornada de autodescoberta pela Europa vitoriana." },
];

export const FOR_YOU: MoviePoster[] = [
  { id: "f1", title: "Cidade de Deus", year: 2002, rating: 8.6, posterUrl: MOVIE_POSTERS["cidade-de-deus"], platforms: ["netflix"], genres: ["Crime", "Drama"], description: "Dois garotos crescem na Cidade de Deus, no Rio de Janeiro, e seguem caminhos opostos: um se torna fotógrafo, o outro, traficante." },
  { id: "f2", title: "Bacurau", year: 2019, rating: 7.4, posterUrl: MOVIE_POSTERS["bacurau"], platforms: ["prime"], genres: ["Ação", "Suspense"], description: "Um pequeno povoado no sertão nordestino misteriosamente desaparece do mapa e seus habitantes precisam lutar para sobreviver." },
  { id: "f3", title: "Central do Brasil", year: 1998, rating: 8.0, posterUrl: MOVIE_POSTERS["central-do-brasil"], platforms: ["prime"], genres: ["Drama"], description: "Uma mulher amargurada leva um menino órfão numa viagem pelo interior do Brasil em busca do pai que ele nunca conheceu." },
  { id: "f4", title: "Tropa de Elite", year: 2007, rating: 8.0, posterUrl: MOVIE_POSTERS["tropa-de-elite"], platforms: ["netflix"], genres: ["Ação", "Crime"], description: "O Capitão Nascimento do BOPE precisa encontrar um substituto enquanto enfrenta a guerra contra o tráfico nas favelas do Rio." },
  { id: "f5", title: "Aquarius", year: 2016, rating: 7.5, posterUrl: MOVIE_POSTERS["aquarius"], platforms: ["prime"], genres: ["Drama"], description: "Clara, uma crítica musical aposentada, é a última moradora de um edifício em Recife e resiste à pressão de uma construtora." },
  { id: "f6", title: "O Auto da Compadecida", year: 2000, rating: 8.3, posterUrl: MOVIE_POSTERS["o-auto-da-compadecida"], platforms: ["disney"], genres: ["Comédia"], description: "João Grilo e Chicó vivem aventuras hilariantes no sertão nordestino, usando a esperteza para sobreviver." },
];

export const LEAVING_SOON: MoviePoster[] = [
  { id: "l1", title: "Parasita", year: 2019, rating: 8.5, posterUrl: MOVIE_POSTERS["parasita"], platforms: ["netflix"], genres: ["Suspense"], description: "Uma família pobre se infiltra na vida de uma família rica, desencadeando uma série de eventos imprevisíveis." },
  { id: "l2", title: "Interestelar", year: 2014, rating: 8.7, posterUrl: MOVIE_POSTERS["interestelar"], platforms: ["prime"], genres: ["Ficção Científica"], description: "Um grupo de astronautas viaja através de um buraco de minhoca em busca de um novo lar para a humanidade." },
  { id: "l3", title: "Whiplash", year: 2014, rating: 8.5, posterUrl: MOVIE_POSTERS["whiplash"], platforms: ["netflix"], genres: ["Drama"], description: "Um jovem baterista de jazz é pressionado além dos limites por um instrutor abusivo em busca da perfeição." },
  { id: "l4", title: "Clube da Luta", year: 1999, rating: 8.8, posterUrl: MOVIE_POSTERS["clube-da-luta"], platforms: ["disney"], genres: ["Drama", "Suspense"], description: "Um homem insone e um fabricante de sabão criam um clube de luta clandestino que evolui para algo muito maior." },
];

export const NEW_RELEASES: MoviePoster[] = [
  { id: "n1", title: "Duna: Parte 2", year: 2024, rating: 8.1, posterUrl: MOVIE_POSTERS["duna-2"], platforms: ["prime"], genres: ["Ficção Científica"], description: "Paul Atreides se une aos Fremen para vingar sua família, enfrentando uma escolha entre o amor e o destino do universo." },
  { id: "n2", title: "Oppenheimer", year: 2023, rating: 8.3, posterUrl: MOVIE_POSTERS["oppenheimer"], platforms: ["prime"], genres: ["Drama"], description: "A história do homem que liderou o Projeto Manhattan e criou a bomba atômica." },
  { id: "n3", title: "Pobres Criaturas", year: 2023, rating: 7.9, posterUrl: MOVIE_POSTERS["poor-things"], platforms: ["disney"], genres: ["Comédia"], description: "Bella Baxter embarca numa jornada de autodescoberta pela Europa vitoriana após ser ressuscitada." },
  { id: "n4", title: "Nosferatu", year: 2024, rating: 7.8, posterUrl: MOVIE_POSTERS["nosferatu"], platforms: ["prime"], genres: ["Terror"], description: "Reimaginação gótica do clássico vampiro de 1922." },
  { id: "n5", title: "Blade Runner 2049", year: 2017, rating: 8.0, posterUrl: MOVIE_POSTERS["blade-runner-2049"], platforms: ["netflix"], genres: ["Ficção Científica"], description: "Um novo blade runner descobre um segredo enterrado que pode mergulhar o que resta da sociedade no caos." },
];

export const NETFLIX_ORIGINALS: MoviePoster[] = [
  { id: "no1", title: "Ainda Estou Aqui", year: 2024, rating: 8.1, posterUrl: MOVIE_POSTERS["ainda-estou-aqui"], platforms: ["netflix"], genres: ["Drama"], description: "Fernanda Torres em performance aclamada sobre resiliência durante a ditadura militar." },
  { id: "no2", title: "3%", year: 2024, rating: 7.2, posterUrl: MOVIE_POSTERS["3-percent"], platforms: ["netflix"], genres: ["Ficção Científica"], description: "Num futuro distópico, jovens competem por uma vaga nos 3% que vivem no lado próspero." },
  { id: "no3", title: "Cidade de Deus", year: 2002, rating: 8.6, posterUrl: MOVIE_POSTERS["cidade-de-deus"], platforms: ["netflix"], genres: ["Crime"], description: "A vida na favela carioca contada através dos olhos de dois meninos com destinos opostos." },
  { id: "no4", title: "Tropa de Elite", year: 2007, rating: 8.0, posterUrl: MOVIE_POSTERS["tropa-de-elite"], platforms: ["netflix"], genres: ["Ação"], description: "O Capitão Nascimento do BOPE enfrenta a guerra contra o tráfico no Rio de Janeiro." },
  { id: "no5", title: "O Som ao Redor", year: 2012, rating: 7.3, posterUrl: MOVIE_POSTERS["o-som-ao-redor"], platforms: ["netflix"], genres: ["Suspense"], description: "A chegada de seguranças privados altera a dinâmica de uma rua de classe média no Recife." },
];
