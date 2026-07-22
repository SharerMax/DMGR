import { createContext, useContext, useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

interface ConfirmState {
  open: boolean
  options: ConfirmOptions
  onConfirm: (() => void) | null
  onCancel: (() => void) | null
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

// ConfirmDialog 组件 - 在外部定义，不在 render 期间创建
function ConfirmDialogComponent({ state, onConfirm, onCancel }: { state: ConfirmState, onConfirm: () => void, onCancel: () => void }) {
  return (
    <AlertDialog open={state.open} onOpenChange={open => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.options.title}</AlertDialogTitle>
          {state.options.description && (
            <AlertDialogDescription>{state.options.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" onClick={onCancel}>
            {state.options.cancelText || '取消'}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={state.options.destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {state.options.confirmText || '确定'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ConfirmDialogProvider - 提供全局状态管理
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    options: { title: '' },
    onConfirm: null,
    onCancel: null,
  })

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        options,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
  }

  const handleConfirm = () => {
    state.onConfirm?.()
    setState({ open: false, options: { title: '' }, onConfirm: null, onCancel: null })
  }

  const handleCancel = () => {
    state.onCancel?.()
    setState({ open: false, options: { title: '' }, onConfirm: null, onCancel: null })
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialogComponent state={state} onConfirm={handleConfirm} onCancel={handleCancel} />
    </ConfirmContext.Provider>
  )
}

// useConfirm hook - 返回 confirm 函数和 ConfirmDialog 组件引用
export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider')
  }

  // ConfirmDialog 现在只是一个占位符，实际组件在 Provider 中渲染
  const ConfirmDialog = () => null

  return { confirm: context.confirm, ConfirmDialog }
}
