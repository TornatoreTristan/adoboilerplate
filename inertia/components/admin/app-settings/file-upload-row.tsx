import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/hooks/use-i18n'
import type { Upload } from './types'

interface Props {
  id: string
  label: string
  hint: string
  accept: string
  current: Upload | null
  uploading: boolean
  imageClassName?: string
  altText: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function FileUploadRow({
  id,
  label,
  hint,
  accept,
  current,
  uploading,
  imageClassName = 'h-16 w-16',
  altText,
  onChange,
}: Props) {
  const { t } = useI18n()

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-4">
        {current && (
          <div className="flex items-center gap-2">
            <img
              src={current.url}
              alt={altText}
              className={`${imageClassName} object-contain rounded border`}
            />
            <span className="text-sm text-muted-foreground">{current.filename}</span>
          </div>
        )}
        <div>
          <input
            type="file"
            id={id}
            accept={accept}
            className="hidden"
            onChange={onChange}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(id)?.click()}
            disabled={uploading}
          >
            {uploading
              ? t('admin.app_settings_page.uploading')
              : t('admin.app_settings_page.choose_file')}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
