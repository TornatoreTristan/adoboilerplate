import * as Sentry from '@sentry/react'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

interface FallbackProps {
  error: Error
  componentStack: string | null
  eventId: string | null
  resetError(): void
}

function ErrorFallback({ error, eventId, resetError }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <Card className="max-w-lg w-full border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An unexpected error occurred. Our team has been notified and we're working on a fix.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {import.meta.env.DEV && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium mb-2">Error details (dev only):</p>
                <pre className="text-xs overflow-auto max-h-40 text-destructive">
                  {error.message}
                </pre>
              </div>
            )}
            {eventId && (
              <div className="text-sm text-muted-foreground">
                <p>
                  Error ID: <code className="bg-muted px-1 py-0.5 rounded">{eventId}</code>
                </p>
                <p className="mt-1 text-xs">You can use this ID when contacting support.</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={resetError} variant="default">
            Try again
          </Button>
          <Button onClick={() => (window.location.href = '/')} variant="outline">
            Go to homepage
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

interface SentryErrorBoundaryProps {
  children: ReactNode
}

export function SentryErrorBoundary({ children }: SentryErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary fallback={ErrorFallback} showDialog={false}>
      {children}
    </Sentry.ErrorBoundary>
  )
}
