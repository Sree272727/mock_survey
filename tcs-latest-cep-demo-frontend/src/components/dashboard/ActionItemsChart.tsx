import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { ActionItems } from "@/types";

const COLORS = ["#ef4444", "#fbbf24", "#94a3b8"];

interface ActionItemsChartProps {
  actionItems: ActionItems;
}

export function ActionItemsChart({ actionItems }: ActionItemsChartProps) {
  if (actionItems.total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Action Items</h3>
        </div>
        <div className="p-5 flex flex-col items-center justify-center h-[250px]">
          <p className="text-sm text-gray-400">No action items</p>
          <p className="text-xs text-emerald-500 mt-1">All clear!</p>
        </div>
      </div>
    );
  }

  const data = [
    { name: "Past Due", value: actionItems.past_due },
    { name: "Due Soon", value: actionItems.due_soon },
    { name: "Pending", value: actionItems.pending },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Action Items</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Open items by urgency level
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
                    entry.name === "Past Due"
                      ? 0
                      : entry.name === "Due Soon"
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
                formatter={(value: any) => [value, "Items"]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: 30 }}>
            <span className="text-2xl font-bold text-gray-900">
              {actionItems.total}
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
