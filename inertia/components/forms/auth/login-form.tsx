import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldSeparator,
  FieldDescription,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useForm } from '@inertiajs/react'
import { FormEvent } from 'react'
import { AlertCircle } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

const LoginForm = ({ className, ...props }: React.ComponentProps<'form'>) => {
  const { t } = useI18n()
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
    remember: false,
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    post('/auth/login')
  }

  const hasErrors = Object.keys(errors).length > 0
  const firstError = hasErrors ? Object.values(errors)[0] : null

  return (
    <>
      <form
        className={cn('flex flex-col gap-6', className)}
        onSubmit={handleSubmit}
        {...props}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">{t('auth.login_form.title')}</h1>
            <p className="text-muted-foreground text-sm text-balance">
              {t('auth.login_form.subtitle')}
            </p>
          </div>
          {hasErrors && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>{t('auth.login_form.error')}</AlertTitle>
              <AlertDescription>{firstError}</AlertDescription>
            </Alert>
          )}
          <Field>
            <FieldLabel htmlFor="email">{t('auth.email')}</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.login_form.email_placeholder')}
              value={data.email}
              onChange={(e) => setData('email', e.target.value)}
              required
            />
          </Field>
          <Field>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
              <a
                href="/password/forgot"
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                {t('auth.forgot_password')}
              </a>
            </div>
            <Input
              id="password"
              type="password"
              value={data.password}
              onChange={(e) => setData('password', e.target.value)}
              required
            />
          </Field>
          <Field>
            <Button type="submit" disabled={processing}>
              {processing ? t('auth.login_form.submitting') : t('auth.login_form.submit')}
            </Button>
          </Field>
          <FieldSeparator>{t('auth.login_form.or_with')}</FieldSeparator>
          <Field>
            <Button variant="outline" type="button" asChild>
              <a href="/auth/google/redirect">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-5">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t('auth.login_form.with_google')}
              </a>
            </Button>
            <FieldDescription className="text-center">
              {t('auth.login_form.no_account')}<br />
              <a href="/register" className="underline underline-offset-4">
                {t('auth.login_form.register_now')}
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </>
  )
}

export default LoginForm
