import { AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import type { FTagCitation, MonthlyStat } from "@/types";

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  D: {
    label: "Isolated",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-l-amber-400",
  },
  E: {
    label: "Pattern",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-l-orange-400",
  },
  F: {
    label: "Widespread",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-l-orange-500",
  },
  G: {
    label: "Actual Harm",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-l-red-500",
  },
  H: {
    label: "Immediate Jeopardy",
    color: "text-red-800",
    bg: "bg-red-100",
    border: "border-l-red-600",
  },
};

interface DeficiencySummaryPanelProps {
  citations: FTagCitation[];
  deficiencies: MonthlyStat;
}

export function DeficiencySummaryPanel({
  citations,
  deficiencies,
}: DeficiencySummaryPanelProps) {
  const totalCitations = citations.reduce((sum, c) => sum + c.count, 0);

  if (totalCitations === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            No Deficiencies Found
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            This facility has no regulatory citations. Keep up the great work!
          </p>
        </div>
      </div>
    );
  }

  // Sort by severity (G before D) then by count
  const sorted = [...citations].sort((a, b) => {
    const sevA = a.scope_severity?.charAt(0) ?? "D";
    const sevB = b.scope_severity?.charAt(0) ?? "D";
    if (sevA !== sevB) return sevB.localeCompare(sevA);
    return b.count - a.count;
  });

  return (
    <div className="space-y-3">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4.5 w-4.5 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Deficiency Details
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">
            <span className="font-bold text-gray-900">{totalCitations}</span>{" "}
            total citations
          </span>
          {deficiencies.previous_month > 0 && (
            <span className="text-gray-400">
              vs {deficiencies.previous_month} last month
            </span>
          )}
        </div>
      </div>

      {/* Citation cards */}
      <div className="space-y-2">
        {sorted.map((citation) => {
          const sevLetter =
            citation.scope_severity?.charAt(0)?.toUpperCase() ?? "D";
          const config = SEVERITY_CONFIG[sevLetter] ?? SEVERITY_CONFIG.D;

          return (
            <div
              key={citation.tag}
              className={`rounded-lg border border-gray-200 border-l-4 ${config.border} p-3 transition-colors hover:bg-gray-50/50`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-bold text-gray-900">
                      {citation.tag}
                    </span>
                    <span className="text-[13px] font-medium text-gray-700 truncate">
                      {citation.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {citation.regulation}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Severity badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color}`}
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {config.label}
                  </span>
                  {/* Count */}
                  <span className="flex items-center justify-center h-6 min-w-[24px] rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                    {citation.count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
