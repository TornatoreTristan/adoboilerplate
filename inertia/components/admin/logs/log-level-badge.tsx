import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, Info, Skull, XCircle } from 'lucide-react'

interface Props {
  level: string
}

const ICONS: Record<string, React.ReactNode> = {
  debug: <Info className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
  warn: <AlertTriangle className="w-4 h-4" />,
  error: <XCircle className="w-4 h-4" />,
  fatal: <Skull className="w-4 h-4" />,
}

const VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  debug: 'outline',
  info: 'default',
  warn: 'secondary',
  error: 'destructive',
  fatal: 'destructive',
}

export function LogLevelBadge({ level }: Props) {
  return (
    <Badge variant={VARIANTS[level] || 'default'} className="flex items-center gap-1">
      {ICONS[level] || <AlertCircle className="w-4 h-4" />}
      {level.toUpperCase()}
    </Badge>
  )
}

export function StatusCodeBadge({ code }: { code: number | null }) {
  if (!code) return null
  let variant: 'default' | 'secondary' | 'destructive' = 'default'
  if (code >= 500) variant = 'destructive'
  else if (code >= 400) variant = 'secondary'
  return <Badge variant={variant}>{code}</Badge>
}
