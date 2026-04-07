import { useMemo, useState } from 'react'

export default function usePagination(initialPage = 1) {
  const [page, setPage] = useState(initialPage)

  const pagination = useMemo(
    () => ({
      page,
      setPage,
      nextPage: () => setPage((current) => current + 1),
      previousPage: () => setPage((current) => Math.max(1, current - 1)),
      resetPage: () => setPage(1),
    }),
    [page],
  )

  return pagination
}