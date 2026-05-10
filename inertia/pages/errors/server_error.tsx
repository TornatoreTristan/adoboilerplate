import { useI18n } from '@/hooks/use-i18n'

export default function ServerError(props: { error: any }) {
  const { t } = useI18n()
  return (
    <>
      <div className="container">
        <div className="title">{t('common.server_error_title')}</div>

        <span>{props.error.message}</span>
      </div>
    </>
  )
}
