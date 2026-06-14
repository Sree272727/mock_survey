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
import type { PathwayCoverageItem } from "@/types";

const PATHWAY_COLORS = ["#0077b6", "#10b981", "#fbbf24", "#8b5cf6", "#f97316"];

interface PathwayCoverageChartProps {
  data: PathwayCoverageItem[];
}

function shortName(name: string, max = 18): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}

export function PathwayCoverageChart({ data }: PathwayCoverageChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Pathway Coverage by Facility
          </h3>
        </div>
        <div className="p-5 flex items-center justify-center h-[220px]">
          <p className="text-sm text-gray-400">
            No pathway coverage data available
          </p>
        </div>
      </div>
    );
  }

  // Get unique pathways and facilities
  const pathwayTitles = [...new Set(data.map((d) => d.pathway_title))];
  const facilityNames = [...new Set(data.map((d) => d.facility_name))];

  // Pivot data: one row per facility, one column per pathway
  const chartData = facilityNames.map((facility) => {
    const row: Record<string, string | number> = {
      name: shortName(facility),
      fullName: facility,
    };
    for (const pw of pathwayTitles) {
      const item = data.find(
        (d) => d.facility_name === facility && d.pathway_title === pw,
      );
      row[pw] = item
        ? item.not_started + item.in_progress + item.completed
        : 0;
    }
    return row;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Pathway Coverage by Facility
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Survey pathway distribution across facilities
        </p>
      </div>

      <div className="p-5">
        <ResponsiveContainer
          width="100%"
          height={Math.max(220, facilityNames.length * 52)}
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
              width={140}
              tick={{ fontSize: 12, fill: "#374151" }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => {
                const item = chartData.find((d) => d.name === label);
                return (item?.fullName as string) ?? label;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            {pathwayTitles.map((pw, i) => (
              <Bar
                key={pw}
                dataKey={pw}
                stackId="a"
                fill={PATHWAY_COLORS[i % PATHWAY_COLORS.length]}
                radius={
                  i === pathwayTitles.length - 1 ? [0, 4, 4, 0] : undefined
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
