import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface Props {
  flash: { success?: string; error?: string }
}

export function SettingsFlashAlerts({ flash }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (flash.success || flash.error) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [flash])

  if (!show) return null

  if (flash.success) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">{flash.success}</AlertDescription>
      </Alert>
    )
  }

  if (flash.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{flash.error}</AlertDescription>
      </Alert>
    )
  }

  return null
}
