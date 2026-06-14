import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#10b981", "#0077b6", "#cbd5e1"];

interface SurveyStatusChartProps {
  total: number;
  completed: number;
  inProgress: number;
}

export function SurveyStatusChart({
  total,
  completed,
  inProgress,
}: SurveyStatusChartProps) {
  if (total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Survey Status</h3>
        </div>
        <div className="p-5 flex items-center justify-center h-[250px]">
          <p className="text-sm text-gray-400">No survey data available</p>
        </div>
      </div>
    );
  }

  const notStarted = total - completed - inProgress;
  const data = [
    { name: "Completed", value: completed },
    { name: "In Progress", value: inProgress },
    { name: "Not Started", value: notStarted },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Survey Status</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Distribution of survey completion
        </p>
      </div>

      <div className="p-5">
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => {
                  const originalIndex =
                    entry.name === "Completed"
                      ? 0
                      : entry.name === "In Progress"
                        ? 1
                        : 2;
                  return (
                    <Cell key={`cell-${i}`} fill={COLORS[originalIndex]} />
                  );
                })}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [value, "Surveys"]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: 30 }}>
            <span className="text-2xl font-bold text-gray-900">{total}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              Total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
