import type { CreateProviderInput, Provider, ProviderField, ProviderType } from '@/stores/providers'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProviderFormValues {
  type: string
  name: string
  config: Record<string, string>
}

interface ProviderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingProvider: Provider | null
  providerTypes: ProviderType[]
  onSubmit: (payload: CreateProviderInput, editingProvider: Provider | null) => Promise<void>
}

export function ProviderFormDialog({
  open,
  onOpenChange,
  editingProvider,
  providerTypes,
  onSubmit,
}: ProviderFormDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProviderFormValues>({
    defaultValues: {
      type: '',
      name: '',
      config: {},
    },
  })

  const selectedType = watch('type')
  const currentType = providerTypes.find(t => t.id === selectedType)

  useEffect(() => {
    if (!open)
      return
    if (editingProvider) {
      let parsedConfig: Record<string, string> = {}
      try {
        parsedConfig = JSON.parse(editingProvider.config)
      }
      catch {
        parsedConfig = {}
      }
      reset({
        type: editingProvider.type,
        name: editingProvider.name,
        config: parsedConfig,
      })
    }
    else {
      reset({ type: '', name: '', config: {} })
    }
  }, [open, editingProvider, reset])

  const handleTypeChange = (typeId: string) => {
    setValue('type', typeId)
    setValue('config', {})
    const type = providerTypes.find(t => t.id === typeId)
    if (type) {
      const currentName = watch('name')
      if (!currentName) {
        setValue('name', type.name)
      }
    }
  }

  const onSubmitForm = async (data: ProviderFormValues) => {
    try {
      const type = editingProvider ? editingProvider.type : data.type

      const payload = {
        type,
        name: data.name,
        config: data.config,
      }

      await onSubmit(payload, editingProvider)
      onOpenChange(false)
    }
    catch (error: any) {
      toast.error(error.message || '操作失败')
    }
  }

  const renderField = (field: ProviderField) => {
    const fieldError = errors.config?.[field.key]
    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-status-danger ml-1">*</span>}
        </Label>
        <Input
          id={field.key}
          type={field.type === 'password' ? 'password' : 'text'}
          {...register(`config.${field.key}`, {
            required: field.required ? `${field.label}为必填项` : false,
          })}
          placeholder={field.placeholder}
          aria-invalid={!!fieldError}
        />
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
        {fieldError && (
          <p className="text-xs text-status-error">{fieldError.message as string}</p>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProvider ? '编辑服务商' : '添加服务商'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          {/* 服务商类型选择 */}
          {!editingProvider && (
            <div className="space-y-2">
              <Label htmlFor="type">
                服务商类型
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Controller
                control={control}
                name="type"
                rules={{ required: '请选择服务商类型' }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={value => handleTypeChange(value ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择服务商类型">
                        {(value: string | null) => {
                          if (!value)
                            return null
                          return providerTypes.find(t => t.id === value)?.name || value
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {providerTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {currentType?.description && (
                <p className="text-xs text-muted-foreground">{currentType.description}</p>
              )}
              {errors.type && (
                <p className="text-xs text-status-error">{errors.type.message}</p>
              )}
            </div>
          )}

          {/* 编辑模式下显示服务商类型 */}
          {editingProvider && (
            <div className="space-y-2">
              <Label>服务商类型</Label>
              <div className="text-sm">
                {currentType?.name}
              </div>
            </div>
          )}

          {/* 服务商名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              名称
              <span className="text-status-danger ml-1">*</span>
            </Label>
            <Input
              id="name"
              {...register('name', { required: '请输入服务商名称' })}
              placeholder="服务商显示名称"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-status-error">{errors.name.message}</p>
            )}
          </div>

          {/* 动态配置字段 */}
          {currentType && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-secondary-foreground">
                API 配置
              </h3>
              {currentType.fields.map(field => renderField(field))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">{editingProvider ? '更新' : '创建'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
