import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminStatsTimeseries } from "@/services/admin-service";

const SIGNUPS_CONFIG = {
  count: {
    label: "Signups",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const WORKFLOWS_CONFIG = {
  count: {
    label: "Workflows created",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const EXECUTIONS_CONFIG = {
  successCount: {
    label: "Succeeded",
    color: "hsl(var(--chart-2))",
  },
  errorCount: {
    label: "Failed",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

function formatTick(value: string): string {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

function formatTooltipLabel(value: unknown): string {
  if (typeof value !== "string") return String(value);
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

interface AdminTrendsChartsProps {
  timeseries: AdminStatsTimeseries | null;
  isLoading: boolean;
  error?: Error | null;
}

export function AdminTrendsCharts({
  timeseries,
  isLoading,
  error,
}: AdminTrendsChartsProps) {
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
          <CardDescription>Unable to load dashboard trends.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {error.message}
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !timeseries) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="aspect-video w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { signups, workflowsCreated, executions } = timeseries.series;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Signups</CardTitle>
          <CardDescription>
            Daily new users · last {timeseries.range.days} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={SIGNUPS_CONFIG}>
            <AreaChart data={signups} margin={{ left: 4, right: 4 }}>
              <defs>
                <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={formatTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                width={32}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={formatTooltipLabel}
                  />
                }
              />
              <Area
                dataKey="count"
                type="monotone"
                fill="url(#fillSignups)"
                stroke="var(--color-count)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflows created</CardTitle>
          <CardDescription>
            Daily workflow creations · last {timeseries.range.days} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={WORKFLOWS_CONFIG}>
            <AreaChart data={workflowsCreated} margin={{ left: 4, right: 4 }}>
              <defs>
                <linearGradient id="fillWorkflows" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={formatTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                width={32}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={formatTooltipLabel}
                  />
                }
              />
              <Area
                dataKey="count"
                type="monotone"
                fill="url(#fillWorkflows)"
                stroke="var(--color-count)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Executions</CardTitle>
          <CardDescription>
            Daily executions by outcome · last {timeseries.range.days} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={EXECUTIONS_CONFIG}>
            <AreaChart data={executions} margin={{ left: 4, right: 4 }}>
              <defs>
                <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-successCount)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-successCount)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillError" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-errorCount)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-errorCount)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={formatTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                width={32}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={formatTooltipLabel}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="successCount"
                type="monotone"
                stackId="1"
                fill="url(#fillSuccess)"
                stroke="var(--color-successCount)"
                strokeWidth={2}
              />
              <Area
                dataKey="errorCount"
                type="monotone"
                stackId="1"
                fill="url(#fillError)"
                stroke="var(--color-errorCount)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
