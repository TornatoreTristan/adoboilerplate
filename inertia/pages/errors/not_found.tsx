import { useI18n } from '@/hooks/use-i18n'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <>
      <div className="container">
        <div className="title">{t('common.not_found_title')}</div>

        <span>{t('common.not_found_message')}</span>
      </div>
    </>
  )
}
