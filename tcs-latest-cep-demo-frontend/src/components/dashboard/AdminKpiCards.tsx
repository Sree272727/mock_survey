import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { MonthlyStat } from "@/types";

interface AdminKpiCardsProps {
  totalFacilities: number;
  totalSurveys: number;
  surveysCompleted: MonthlyStat;
  deficiencies: MonthlyStat;
}

function CompletionDelta({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (current === previous) return null;
  const up = current > previous;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? "text-emerald-500" : "text-red-500"
      }`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {previous > 0
        ? `${Math.abs(Math.round(((current - previous) / previous) * 100))}%`
        : `+${current}`}
    </span>
  );
}

function DeficiencyDelta({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (current === previous) return null;
  const up = current > previous;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? "text-red-500" : "text-emerald-500"
      }`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {previous > 0
        ? `${Math.abs(Math.round(((current - previous) / previous) * 100))}%`
        : `+${current}`}
    </span>
  );
}

export function AdminKpiCards({
  totalFacilities,
  totalSurveys,
  surveysCompleted,
  deficiencies,
}: AdminKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Facilities */}
      <div className="bg-white rounded-lg border border-gray-200 p-3.5 border-l-4 border-l-[#0077b6]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Facilities
          </p>
          <Building2 className="h-4 w-4 text-[#0077b6]" />
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {totalFacilities}
        </p>
        <p className="mt-1 text-xs text-gray-400">Active on platform</p>
      </div>

      {/* Total Surveys */}
      <div className="bg-white rounded-lg border border-gray-200 p-3.5 border-l-4 border-l-slate-500">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Total Surveys
          </p>
          <ClipboardList className="h-4 w-4 text-slate-400" />
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-900">{totalSurveys}</p>
        <p className="mt-1 text-xs text-gray-400">All survey cases</p>
      </div>

      {/* Surveys Completed */}
      <div className="bg-white rounded-lg border border-gray-200 p-3.5 border-l-4 border-l-emerald-500">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Completed
          </p>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {surveysCompleted.current_month}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span>This month</span>
          <CompletionDelta
            current={surveysCompleted.current_month}
            previous={surveysCompleted.previous_month}
          />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          vs {surveysCompleted.previous_month} last month
        </p>
      </div>

      {/* Deficiencies */}
      <div className="bg-white rounded-lg border border-gray-200 p-3.5 border-l-4 border-l-red-500">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Deficiencies
          </p>
          <AlertTriangle className="h-4 w-4 text-red-400" />
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {deficiencies.current_month}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span>This month</span>
          <DeficiencyDelta
            current={deficiencies.current_month}
            previous={deficiencies.previous_month}
          />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          vs {deficiencies.previous_month} last month
        </p>
      </div>
    </div>
  );
}
