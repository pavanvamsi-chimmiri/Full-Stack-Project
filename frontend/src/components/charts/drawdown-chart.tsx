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

interface DrawdownChartProps {
  data: Array<{ date: string; drawdown: number }>;
}

export function DrawdownChart({ data }: DrawdownChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Drawdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.slice(0, 7)}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Number(v).toFixed(1)}%`} />
              <Tooltip
                formatter={(value) => [`${Number(value ?? 0).toFixed(2)}%`, "Drawdown"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#ddGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
