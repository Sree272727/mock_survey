import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { FacilityCitationRank } from "@/types";

interface CitationsByFacilityChartProps {
  data: FacilityCitationRank[];
}

function shortName(name: string, max = 16): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}

export function CitationsByFacilityChart({
  data,
}: CitationsByFacilityChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Citations per Facility
          </h3>
        </div>
        <div className="p-5 flex items-center justify-center h-[280px]">
          <p className="text-sm text-gray-400">No facility data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: shortName(d.facility_name),
    fullName: d.facility_name,
    citations: d.citation_count,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Citations per Facility
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Total regulatory citations by facility
        </p>
      </div>

      <div className="p-5">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            barCategoryGap="25%"
            margin={{ top: 5, right: 20, bottom: 50, left: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f0f0f0"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#374151" }}
              angle={-35}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
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
                return item?.fullName ?? label;
              }}
            />
            <Bar
              dataKey="citations"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              name="Citations"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
