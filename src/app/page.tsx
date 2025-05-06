"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Episode } from "@/utils/types";
import { formatDate } from "@/utils/ui";

interface ApiResponse {
  total: number;
  offset: number;
  limit: number;
  data: (Episode & { highlight?: Record<string, string[]> })[];
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    (Episode & { highlight?: Record<string, string[]> })[]
  >([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exactPhrase, setExactPhrase] = useState(false);
  const [searchTitle, setSearchTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // Function to update URL with current search state
  const updateUrl = (newParams: Record<string, string | boolean>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === "" || value === false) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.push(newUrl);
  };

  // Effect to load initial search from URL parameters
  useEffect(() => {
    const queryParam = searchParams.get("query") || "";
    const exactPhraseParam = searchParams.get("exactPhrase") === "true";
    const searchTitleParam = searchParams.get("searchTitle") === "true";

    setQuery(queryParam);
    setExactPhrase(exactPhraseParam);
    setSearchTitle(searchTitleParam);

    // We only want to trigger a search on initial load or when URL params change
    // We don't call handleSearch directly to avoid a circular update
    if (queryParam) {
      const fetchResults = async () => {
        setIsLoading(true);
        try {
          const params = new URLSearchParams();
          if (queryParam.trim()) params.append("query", queryParam);
          params.append("exactPhrase", exactPhraseParam.toString());
          params.append("searchTitle", searchTitleParam.toString());
          params.append("limit", "50");

          const response = await fetch(`/api/episodes?${params.toString()}`);
          if (!response.ok) {
            throw new Error(
              `API request failed with status ${response.status}`
            );
          }

          const data: ApiResponse = await response.json();
          setResults(data.data);
          setTotalResults(data.total);
        } catch (error) {
          console.error("Error searching episodes:", error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchResults();
    }
  }, [searchParams]);

  const handleSearch = async () => {
    setIsLoading(true);

    // Update URL with current search parameters
    updateUrl({
      query,
      exactPhrase,
      searchTitle,
    });

    try {
      // Build the API URL with query parameters
      const params = new URLSearchParams();
      if (query.trim()) params.append("query", query);
      params.append("exactPhrase", exactPhrase.toString());
      params.append("searchTitle", searchTitle.toString());
      params.append("limit", "50"); // Set a reasonable limit

      // Fetch from our API route
      const response = await fetch(`/api/episodes?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setResults(data.data);
      setTotalResults(data.total);
    } catch (error) {
      console.error("Error searching episodes:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [offset, setOffset] = useState(0);
  const pageSize = 10;

  const loadMore = async () => {
    if (isLoading || !query.trim()) return;

    setIsLoading(true);
    const newOffset = offset + pageSize;
    setOffset(newOffset);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("query", query);
      params.append("exactPhrase", exactPhrase.toString());
      params.append("searchTitle", searchTitle.toString());
      params.append("limit", pageSize.toString());
      params.append("offset", newOffset.toString());

      const response = await fetch(`/api/episodes?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setResults((prev) => [...prev, ...data.data]);
      setCurrentPage((prev) => prev + 1);
    } catch (error) {
      console.error("Error loading more episodes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6 font-['Anonymous_Pro']">
        Episode Archive
      </h1>

      <div className="flex mb-4 relative max-w-[400px] mx-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Don't update URL on every keystroke - only when Enter pressed or Search clicked
          }}
          placeholder="Search episodes..."
          className="flex-grow p-2 border border-gray-300 rounded-l"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          onClick={handleSearch}
          className="absolute top-0 right-0 bg-blue-500 text-white p-2 rounded-r"
        >
          Search
        </button>
      </div>
      <div className="text-center">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-4 text-blue-500 underline"
        >
          Advanced Options
        </button>
      </div>

      {showAdvanced && (
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <label className="block mb-2">
            <input
              type="checkbox"
              checked={exactPhrase}
              onChange={() => {
                const newValue = !exactPhrase;
                setExactPhrase(newValue);
                updateUrl({ exactPhrase: newValue });
              }}
              className="mr-2"
            />
            Exact Phrase
          </label>
          <label className="block">
            <input
              type="checkbox"
              checked={searchTitle}
              onChange={() => {
                const newValue = !searchTitle;
                setSearchTitle(newValue);
                updateUrl({ searchTitle: newValue });
              }}
              className="mr-2"
            />
            Episode Title
          </label>
        </div>
      )}

      <div className="mt-6">
        {isLoading && results.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading episodes...</p>
          </div>
        ) : results.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Found {totalResults} episode{totalResults !== 1 ? "s" : ""}
            </h2>
            <ul className="space-y-6">
              {results.map((episode) => (
                <li key={episode.id} className="border p-4 rounded">
                  <h3 className="text-3xl font-bold">{episode.title}</h3>
                  <p className="text-lg font-bold text-gray-600">
                    {formatDate(episode.air_date)} | {episode.duration}
                  </p>

                  {episode.highlight &&
                    Object.keys(episode.highlight).length > 0 && (
                      <div className="mt-2 py-4 rounded text-sm">
                        {/* <p className="font-medium text-xs text-gray-700 mb-1">
                          Matching content:
                        </p> */}
                        {Object.entries(episode.highlight).map(
                          ([field, highlights]) => (
                            <div key={field}>
                              {highlights.map((html, i) => (
                                <p
                                  key={`${episode.id}-highlight-${i}`}
                                  className="mb-1 text-md font-mono"
                                  dangerouslySetInnerHTML={{ __html: html }}
                                />
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    )}

                  <a
                    href={episode.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline mt-2 inline-block"
                  >
                    Watch Episode
                  </a>
                </li>
              ))}
            </ul>

            {results.length < totalResults && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                  {isLoading ? "Loading..." : "Load More Results"}
                </button>
              </div>
            )}
          </div>
        ) : query ? (
          <p className="text-center text-gray-500">No episodes found.</p>
        ) : (
          <p className="text-center text-gray-500">
            Enter a search term to find episodes.
          </p>
        )}
      </div>
      <div>{currentPage}</div>
    </div>
  );
}
