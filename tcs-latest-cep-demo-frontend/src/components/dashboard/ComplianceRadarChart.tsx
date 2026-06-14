import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ComplianceAreaScore } from "@/types";

interface ComplianceRadarChartProps {
  scores: ComplianceAreaScore[];
}

function shortAreaName(name: string): string {
  const map: Record<string, string> = {
    "Quality of Care": "Quality",
    "Abuse / Neglect": "Abuse/Neglect",
    "Infection Control": "Infection Ctrl",
    "Care Planning": "Care Plan",
  };
  return map[name] ?? name;
}

export function ComplianceRadarChart({ scores }: ComplianceRadarChartProps) {
  if (scores.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Compliance Scores by Area
          </h3>
        </div>
        <div className="p-5 flex items-center justify-center h-[300px]">
          <p className="text-sm text-gray-400">No compliance data available</p>
        </div>
      </div>
    );
  }

  const chartData = scores.map((s) => ({
    area: shortAreaName(s.area_name),
    score: s.score,
    fullName: s.area_name,
    regulation: s.regulation,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Compliance Scores by Area
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Aggregate scores across all facilities (0–100)
        </p>
      </div>

      <div className="p-5">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="area"
              tick={{ fontSize: 11, fill: "#374151" }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              angle={30}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${value}/100`, "Score"]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => {
                const item = chartData.find((d) => d.area === label);
                return item ? `${item.fullName} (${item.regulation})` : label;
              }}
            />
            <Radar
              dataKey="score"
              stroke="#0077b6"
              fill="#0077b6"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
