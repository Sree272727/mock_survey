import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { FacilitySurveyFrequency } from "@/types";

interface SurveyFrequencyChartProps {
  data: FacilitySurveyFrequency[];
}

/** Shorten long facility names for chart axis labels */
function shortName(name: string, max = 18): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}

export function SurveyFrequencyChart({ data }: SurveyFrequencyChartProps) {
  const chartData = data.map((d) => ({
    name: shortName(d.facility_name),
    fullName: d.facility_name,
    Completed: d.completed,
    "In Progress": d.in_progress,
    "Other": d.total_surveys - d.completed - d.in_progress,
  }));

  const totalSurveys = data.reduce((s, d) => s + d.total_surveys, 0);
  const thisMonth = data.reduce((s, d) => s + d.monthly_count, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Survey Activity by Facility
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Assessment frequency and completion status
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className="font-semibold text-gray-900 text-sm">
              {totalSurveys}
            </span>
            Total
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="font-semibold text-sm">{thisMonth}</span>
            <span className="text-gray-500">this month</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 52)}>
          <BarChart
            data={chartData}
            layout="vertical"
            barCategoryGap="20%"
            margin={{ top: 0, right: 20, bottom: 0, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 12, fill: "#374151" }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
              formatter={(value: number, name: string) => [value, name]}
              labelFormatter={(label: string) => {
                const item = chartData.find((d) => d.name === label);
                return item?.fullName ?? label;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar
              dataKey="Completed"
              stackId="a"
              fill="#10b981"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="In Progress"
              stackId="a"
              fill="#0077b6"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Other"
              stackId="a"
              fill="#cbd5e1"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
