import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { FTagCitation } from "@/types";

interface CitationsByTagChartProps {
  data: FTagCitation[];
}

function shortLabel(tag: string, title: string, max = 24): string {
  const label = `${tag} – ${title}`;
  if (label.length <= max) return label;
  return label.slice(0, max - 1) + "…";
}

export function CitationsByTagChart({ data }: CitationsByTagChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Citations by F-Tag
          </h3>
        </div>
        <div className="p-5 flex items-center justify-center h-[220px]">
          <p className="text-sm text-gray-400">No citation data available</p>
        </div>
      </div>
    );
  }

  const chartData = [...data]
    .sort((a, b) => b.count - a.count)
    .map((d) => ({
      name: shortLabel(d.tag, d.title),
      fullName: `${d.tag} – ${d.title}`,
      regulation: d.regulation,
      count: d.count,
    }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Citations by F-Tag
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Regulatory citations ranked by frequency
        </p>
      </div>

      <div className="p-5">
        <ResponsiveContainer
          width="100%"
          height={Math.max(220, chartData.length * 40)}
        >
          <BarChart
            data={chartData}
            layout="vertical"
            barCategoryGap="20%"
            margin={{ top: 0, right: 20, bottom: 0, left: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f0f0f0"
              horizontal={false}
            />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{ fontSize: 11, fill: "#374151" }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [value, "Citations"]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => {
                const item = chartData.find((d) => d.name === label);
                return item ? `${item.fullName}\n${item.regulation}` : label;
              }}
            />
            <Bar
              dataKey="count"
              fill="#0077b6"
              radius={[0, 4, 4, 0]}
              name="Citations"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
