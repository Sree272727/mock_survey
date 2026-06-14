import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonthlyStat } from "@/types";

interface CitationTrendChartProps {
  deficiencies: MonthlyStat;
  surveysCompleted: MonthlyStat;
}

export function CitationTrendChart({ deficiencies, surveysCompleted }: CitationTrendChartProps) {
  const data = [
    {
      name: "Citations",
      "This Month": deficiencies.current_month,
      "Last Month": deficiencies.previous_month,
    },
    {
      name: "Surveys",
      "This Month": surveysCompleted.current_month,
      "Last Month": surveysCompleted.previous_month,
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Trends</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="This Month" fill="#0077b6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Last Month" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
