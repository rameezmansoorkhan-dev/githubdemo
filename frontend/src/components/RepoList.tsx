import type { Repo } from '../api/types';
import ScoreBar from './ScoreBar';

interface Props {
  repos: Repo[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function RepoList({ repos }: Props) {
  return (
    <ul className="divide-y divide-gray-100">
      {repos.map((repo) => (
        <li key={repo.id} className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-blue-700 hover:underline"
              >
                {repo.fullName}
              </a>
              {repo.description && (
                <p className="mt-1 text-sm text-gray-600">{repo.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {repo.language && <span>{repo.language}</span>}
                <span>★ {repo.stars.toLocaleString()}</span>
                <span>⑂ {repo.forks.toLocaleString()}</span>
                <span>pushed {formatDate(repo.pushedAt)}</span>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <ScoreBar score={repo.score} breakdown={repo.scoreBreakdown} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}