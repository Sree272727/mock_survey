import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => {
      if (pageCount <= 5) return true
      if (p === 1 || p === pageCount) return true
      return Math.abs(p - page) <= 1
    }
  )

  return (
    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
      <p className="text-xs text-gray-400">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, idx) => {
          const prev = pages[idx - 1]
          const showEllipsis = prev !== undefined && p - prev > 1
          return (
            <span key={p} className="flex items-center">
              {showEllipsis && (
                <span className="px-1 text-xs text-gray-400">...</span>
              )}
              <Button
                variant={p === page ? "default" : "ghost"}
                size="sm"
                onClick={() => onPageChange(p)}
                className="h-7 w-7 p-0 text-xs"
              >
                {p}
              </Button>
            </span>
          )
        })}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
