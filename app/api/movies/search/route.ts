import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/services/movieService";
import { SearchType } from "@/types/movie";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") || "";
  const rawType = (searchParams.get("type") || "ALL").toUpperCase();
  const type: SearchType =
    rawType === "MOVIE" || rawType === "PERSON" ? rawType : "ALL";
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!query || query.trim().length < 2) {
    return NextResponse.json({
      query,
      totalMatches: 0,
      movies: [],
      actors: [],
      crew: [],
    });
  }

  const results = await searchCatalog(query, type, page);
  return NextResponse.json(results);
}

