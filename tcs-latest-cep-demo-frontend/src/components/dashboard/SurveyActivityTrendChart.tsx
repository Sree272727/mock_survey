import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ActivityTrendPoint } from "@/types";

type Props = { data: ActivityTrendPoint[] };

export function SurveyActivityTrendChart({ data }: Props) {
  const chartData = data.map((d) => ({
    period: d.period,
    Completed: d.completed,
    "In Progress": d.in_progress,
    New: d.new,
  }));

  const total = data.reduce((s, d) => s + d.completed + d.in_progress + d.new, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Survey Activity Trend
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Survey volume by status over time
          </p>
        </div>
        <span className="text-xs font-semibold text-[#0077b6] bg-blue-50 rounded-full px-2.5 py-0.5">
          {total} total
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <Area
            type="monotone"
            dataKey="Completed"
            stackId="1"
            stroke="#10b981"
            fill="url(#colorCompleted)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="In Progress"
            stackId="1"
            stroke="#3b82f6"
            fill="url(#colorInProgress)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="New"
            stackId="1"
            stroke="#9ca3af"
            fill="url(#colorNew)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
