import { useState, useMemo } from "react";

const PAGE_SIZE = 10;

interface UseFilteredPaginatedOptions<T> {
  items: T[];
  searchFields: (item: T) => string[];
  filterFn?: (item: T) => boolean;
}

export function useFilteredPaginated<T>({
  items,
  searchFields,
  filterFn,
}: UseFilteredPaginatedOptions<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = items;
    if (filterFn) result = result.filter(filterFn);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((item) =>
        searchFields(item).some((f) => f.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [items, search, filterFn, searchFields]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return {
    search,
    setSearch: handleSearch,
    page: safePage,
    setPage,
    filtered,
    paged,
    totalPages,
    totalFiltered: filtered.length,
    pageSize: PAGE_SIZE,
  };
}
