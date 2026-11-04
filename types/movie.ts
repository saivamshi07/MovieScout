/**
 * TypeScript Data Model matching movie-service JSON responses
 */

export interface Movie {
  id: number;
  title: string;
  overview?: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  releaseDate?: string;
  releaseYear?: number;
  originalLanguage?: string;
  industry?: string;
  genres?: string[];
  tmdbVoteAverage?: number;
  platformRating?: number;
  platformRatingCount?: number;
  matchScore?: string;
  matchReason?: string;
}

export interface CastMember {
  id: number;
  name: string;
  character?: string;
  profileUrl?: string | null;
  order?: number;
}

export interface CrewMember {
  id: number;
  name: string;
  department?: string;
  job?: string;
  profileUrl?: string | null;
  roles?: string[];
}

export interface directors {
  name : string;
}

export interface writers {
  name : string;
}

export interface MovieDetail extends Movie {
  tagline?: string;
  runtime?: number;
  status?: string;
  directors?: directors[];
  writers?: writers[];
  topCast?: CastMember[];
  crew?: CrewMember[];
}

export interface SectionResponse {
  section: string;
  title: string;
  page: number;
  totalPages: number;
  totalResults: number;
  movies: Movie[];
}

export interface ActorDetail {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  age?: number;
  placeOfBirth?: string;
  profileUrl?: string | null;
  filmsActed?: Movie[];
}

export interface CrewWorkedFilm {
  id: number;
  title: string;
  department?: string;
  job?: string;
  releaseDate?: string;
  releaseYear?: number;
  posterUrl?: string | null;
  tmdbVoteAverage?: number;
  roles?: string[];
}

export interface CrewDetail {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  knownForDepartment?: string;
  profileUrl?: string | null;
  primaryDesignations?: string[];
  filmsWorked?: CrewWorkedFilm[];
}

export type SearchType = "ALL" | "MOVIE" | "PERSON";

export interface ActorSearchResult {
  id: number;
  name: string;
  profileUrl?: string | null;
  knownFor?: string[];
}

export interface CrewSearchResult {
  id: number;
  name: string;
  department?: string;
  profileUrl?: string | null;
  knownFor?: string[];
}

export interface MultiSearchResponse {
  query: string;
  totalMatches: number;
  movies: Movie[];
  actors: ActorSearchResult[];
  crew: CrewSearchResult[];
}

export interface Review {
  id: string;
  userId: string;
  movieId: number;
  movieTitle?: string;
  moviePosterUrl?: string | null;
  rating: number; // 1.0 to 5.0
  reviewText?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReviewPageResponse {
  content: Review[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ReviewAuthor {
  id: string;
  username: string;
  pictureUrl?: string | null;
}




