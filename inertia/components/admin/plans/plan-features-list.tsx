import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

interface Props {
  features: string[]
}

export function PlanFeaturesList({ features }: Props) {
  const { t } = useI18n()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.plan_show.card_features')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
