import { ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'

import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Pagination as PaginationPrimitive,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

function DataTablePagination({
  itemsPerPage,
  totalItems,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: {
  itemsPerPage: number
  totalItems: number
  currentPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (size: number) => void
  pageSizeOptions?: number[]
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (totalItems === 0)
    return null

  // 生成页码数组（带省略号），与 shadcn Pagination 文档示例保持一致
  const pages: (number | 'ellipsis')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i)
    }
    else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis')
    }
  }

  const handleNavigate = (page: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-4">
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
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">每页</span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={value => onItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map(size => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">条</span>
          </div>
        )}
      </div>
      <PaginationPrimitive className="mx-0 w-auto">
        <PaginationContent>
          {/* 第一页 */}
          <PaginationItem>
            <PaginationLink
              href="#"
              aria-label="Go to first page"
              onClick={handleNavigate(1)}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
            >
              <ChevronsLeftIcon className="size-4" />
            </PaginationLink>
          </PaginationItem>

          {/* 上一页 */}
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="上一页"
              onClick={handleNavigate(currentPage - 1)}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>

          {/* 页码与省略号 */}
          {pages.map((page, index) => (
            <PaginationItem key={typeof page === 'number' ? `page-${page}` : `ellipsis-before-${pages[index + 1] ?? 'end'}`}>
              {typeof page === 'number'
                ? (
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={handleNavigate(page)}
                    >
                      {page}
                    </PaginationLink>
                  )
                : (
                    <PaginationEllipsis />
                  )}
            </PaginationItem>
          ))}

          {/* 下一页 */}
          <PaginationItem>
            <PaginationNext
              href="#"
              text="下一页"
              onClick={handleNavigate(currentPage + 1)}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>

          {/* 最后一页 */}
          <PaginationItem>
            <PaginationLink
              href="#"
              aria-label="Go to last page"
              onClick={handleNavigate(totalPages)}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
            >
              <ChevronsRightIcon className="size-4" />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </PaginationPrimitive>
    </div>
  )
}

export { DataTablePagination }
