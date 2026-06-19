import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Pagination({
  itemsPerPage,
  totalItems,
  currentPage,
  onPageChange,
  className,
}: {
  itemsPerPage: number
  totalItems: number
  currentPage: number
  onPageChange: (page: number) => void
  className?: string
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (totalItems === 0)
    return null

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i)
    }
    else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className={cn('flex items-center justify-between px-4 py-3', className)}>
      <span className="text-sm text-muted-foreground">
        显示
        {' '}
        {(currentPage - 1) * itemsPerPage + 1}
        {' '}
        -
        {' '}
        {Math.min(currentPage * itemsPerPage, totalItems)}
        {' '}
        条，共
        {' '}
        {totalItems}
        {' '}
        条
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="size-8"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="size-8"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((page, index) => (
          typeof page === 'number'
            ? (
                <Button
                  key={index}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => onPageChange(page)}
                  className={cn(
                    'size-8 min-w-8',
                    currentPage === page && 'bg-primary text-primary-foreground',
                  )}
                >
                  {page}
                </Button>
              )
            : (
                <span key={index} className="flex size-8 items-center justify-center text-sm text-muted-foreground">
                  ...
                </span>
              )
        ))}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="size-8"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="size-8"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export { Pagination }
