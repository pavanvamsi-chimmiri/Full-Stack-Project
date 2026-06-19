"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface EquityCurveChartProps {
  data: Array<{ date: string; value: number }>;
  title?: string;
}

export function EquityCurveChart({ data, title = "Equity Curve" }: EquityCurveChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.slice(0, 7)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `INR ${(Number(v) / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value ?? 0)), "Portfolio Value"]}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#equityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
