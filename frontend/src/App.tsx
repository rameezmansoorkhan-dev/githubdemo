import { useUrlSearchState } from './hooks/useUrlSearchState';
import { useRepositories } from './hooks/useRepositories';
import SearchForm from './components/SearchForm';
import RepoList from './components/RepoList';
import Pagination from './components/Pagination';

export default function App() {
  const { params, update } = useUrlSearchState();
  const { data, loading, error } = useRepositories(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            GitHub Repository Popularity Ranker
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Search repositories and rank them by a transparent popularity score.
          </p>
        </header>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <SearchForm initial={params} onSearch={update} />
        </div>

        {/* Operational visibility: GitHub quota remaining. */}
        {data?.rateLimitRemaining != null && (
          <p className="mt-3 text-xs text-gray-500" aria-live="polite">
            GitHub API requests remaining: {data.rateLimitRemaining}
          </p>
        )}

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          {/* Loading state */}
          {loading && (
            <p className="py-8 text-center text-sm text-gray-500" aria-live="polite">
              Loading repositories…
            </p>
          )}

          {/* Error state */}
          {!loading && error && (
            <div
              className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              <strong className="font-semibold">Error:</strong> {error.message}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && data && data.items.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No repositories matched your search.
            </p>
          )}

          {/* Results */}
          {!loading && !error && data && data.items.length > 0 && (
            <>
              <p className="mb-2 text-sm text-gray-500">
                {Math.min(data.total, 1000).toLocaleString()} results
              </p>
              <RepoList repos={data.items} />
              <div className="mt-4">
                <Pagination
                  page={params.page}
                  perPage={params.perPage}
                  total={data.total}
                  onPageChange={(page) => update({ page })}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}