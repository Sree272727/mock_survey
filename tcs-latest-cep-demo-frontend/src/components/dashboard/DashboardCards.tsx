import { AlertTriangle, CheckCircle2, ClipboardList, TrendingDown, TrendingUp } from "lucide-react";
import type { MonthlyStat, ActionItems } from "@/types";

interface DashboardCardsProps {
  deficiencies: MonthlyStat;
  actionItems: ActionItems;
  surveysCompleted: MonthlyStat;
  totalCases: number;
  inProgress: number;
  completed: number;
}

function DeltaArrow({ current, previous }: { current: number; previous: number }) {
  if (current === previous) return null;
  const up = current > previous;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-red-500" : "text-emerald-500"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {previous > 0 ? `${Math.abs(Math.round(((current - previous) / previous) * 100))}%` : `+${current}`}
    </span>
  );
}

function CompletionDelta({ current, previous }: { current: number; previous: number }) {
  if (current === previous) return null;
  const up = current > previous;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-500" : "text-red-500"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {previous > 0 ? `${Math.abs(Math.round(((current - previous) / previous) * 100))}%` : `+${current}`}
    </span>
  );
}

export function DashboardCards({
  deficiencies,
  actionItems,
  surveysCompleted,
  totalCases,
  inProgress,
  completed,
}: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Deficiencies */}
      <div className="bg-white rounded-lg border border-gray-200 p-3.5 border-l-4 border-l-red-500">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Deficiencies</p>
          <AlertTriangle className="h-4 w-4 text-red-400" />
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-900">{deficiencies.current_month}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span>This month</span>
          <DeltaArrow current={deficiencies.current_month} previous={deficiencies.previous_month} />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">vs {deficiencies.previous_month} last month</p>
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-lg border border-gray-200 p-3.5 border-l-4 border-l-amber-500">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Action Items</p>
          <ClipboardList className="h-4 w-4 text-amber-400" />
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-900">{actionItems.total}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {actionItems.past_due > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
              {actionItems.past_due} Past Due
            </span>
          )}
          {actionItems.due_soon > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
              {actionItems.due_soon} Due Soon
            </span>
          )}
          {actionItems.pending > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
              {actionItems.pending} Pending
            </span>
          )}
        </div>
      </div>

      {/* Surveys Completed */}
      <div className="bg-white rounded-lg border border-gray-200 p-3.5 border-l-4 border-l-emerald-500">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Surveys Completed</p>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-900">{surveysCompleted.current_month}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span>This month</span>
          <CompletionDelta current={surveysCompleted.current_month} previous={surveysCompleted.previous_month} />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">vs {surveysCompleted.previous_month} last month</p>
      </div>

      {/* Total Cases */}
      <div className="bg-white rounded-lg border border-gray-200 p-3.5 border-l-4 border-l-[#0077b6]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Cases</p>
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-900">{totalCases}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            {inProgress} In Progress
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {completed} Completed
          </span>
        </div>
      </div>
    </div>
  );
}
