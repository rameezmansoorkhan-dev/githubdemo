interface Props {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Pagination clamped to GitHub's 1000-result ceiling. */
export default function Pagination({ page, perPage, total, onPageChange }: Props) {
  const cappedTotal = Math.min(total, 1000);
  const maxPage = Math.max(1, Math.ceil(cappedTotal / perPage));

  return (
    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
      >
        Previous
      </button>
      <span className="text-sm text-gray-600">
        Page {page} of {maxPage}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= maxPage}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
      >
        Next
      </button>
    </div>
  );
}