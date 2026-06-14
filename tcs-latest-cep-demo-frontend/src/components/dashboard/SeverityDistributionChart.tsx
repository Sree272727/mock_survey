import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { FTagCitation } from "@/types";

const SEVERITY_COLORS: Record<string, string> = {
  D: "#fbbf24",
  E: "#f59e0b",
  F: "#f97316",
  G: "#ef4444",
  H: "#dc2626",
};

const SEVERITY_LABELS: Record<string, string> = {
  D: "Isolated",
  E: "Pattern",
  F: "Widespread",
  G: "Actual Harm",
  H: "Immediate Jeopardy",
};

interface SeverityDistributionChartProps {
  data: FTagCitation[];
}

export function SeverityDistributionChart({
  data,
}: SeverityDistributionChartProps) {
  const totalDeficiencies = data.reduce((sum, d) => sum + d.count, 0);

  if (totalDeficiencies === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Severity Distribution
          </h3>
        </div>
        <div className="p-5 flex items-center justify-center h-[250px]">
          <p className="text-sm text-gray-400">No deficiency data available</p>
        </div>
      </div>
    );
  }

  // Group by severity letter (first character of scope_severity)
  const severityMap = new Map<string, number>();
  for (const d of data) {
    const letter = d.scope_severity?.charAt(0)?.toUpperCase() ?? "D";
    severityMap.set(letter, (severityMap.get(letter) ?? 0) + d.count);
  }

  const chartData = Array.from(severityMap.entries())
    .map(([letter, count]) => ({
      name: `${SEVERITY_LABELS[letter] ?? letter} (${letter})`,
      value: count,
      letter,
    }))
    .sort((a, b) => a.letter.localeCompare(b.letter));

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Severity Distribution
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Deficiencies by scope &amp; severity level
        </p>
      </div>

      <div className="p-5">
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={SEVERITY_COLORS[entry.letter] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [value, "Citations"]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: 30 }}>
            <span className="text-2xl font-bold text-gray-900">
              {totalDeficiencies}
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              Total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
