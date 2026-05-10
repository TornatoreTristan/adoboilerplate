import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useI18n } from '@/hooks/use-i18n'
import type { HistoryPoint } from './types'

interface Props {
  history: HistoryPoint[]
}

const chartConfig = {
  database: { label: 'Database', color: 'hsl(var(--chart-1))' },
  redis: { label: 'Redis', color: 'hsl(var(--chart-2))' },
  cpu: { label: 'CPU', color: 'hsl(var(--chart-3))' },
  memory: { label: 'Memory', color: 'hsl(var(--chart-4))' },
  cacheHitRate: { label: 'Cache Hit Rate', color: 'hsl(var(--chart-5))' },
}

/**
 * Three time-series charts driven by the same `history` array. Caller
 * is expected to gate this behind `history.length > 0` — if there's
 * no data yet there's nothing to plot.
 */
export function MonitoringCharts({ history }: Props) {
  const { t } = useI18n()

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.monitoring.chart_response_time_title')}</CardTitle>
          <CardDescription>
            {t('admin.monitoring.chart_response_time_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <AreaChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="database"
                stackId="1"
                stroke="var(--color-database)"
                fill="var(--color-database)"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="redis"
                stackId="1"
                stroke="var(--color-redis)"
                fill="var(--color-redis)"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.monitoring.chart_cpu_memory_title')}</CardTitle>
            <CardDescription>
              {t('admin.monitoring.chart_cpu_memory_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  domain={[0, 100]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="var(--color-cpu)"
                  fill="var(--color-cpu)"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="var(--color-memory)"
                  fill="var(--color-memory)"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.monitoring.chart_cache_title')}</CardTitle>
            <CardDescription>{t('admin.monitoring.chart_cache_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  domain={[0, 100]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="cacheHitRate"
                  stroke="var(--color-cacheHitRate)"
                  fill="var(--color-cacheHitRate)"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
