import { Monitor, Smartphone, Tablet } from 'lucide-react'

export function getDeviceIcon(deviceType: string | null) {
  if (!deviceType) return <Monitor className="h-4 w-4" />
  if (deviceType.toLowerCase().includes('mobile')) return <Smartphone className="h-4 w-4" />
  if (deviceType.toLowerCase().includes('tablet')) return <Tablet className="h-4 w-4" />
  return <Monitor className="h-4 w-4" />
}

export function formatAction(action: string): string {
  return action
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getActionBadgeVariant(
  action: string
): 'default' | 'secondary' | 'destructive' {
  if (action.includes('deleted') || action.includes('failed')) return 'destructive'
  if (action.includes('created') || action.includes('success')) return 'default'
  return 'secondary'
}
