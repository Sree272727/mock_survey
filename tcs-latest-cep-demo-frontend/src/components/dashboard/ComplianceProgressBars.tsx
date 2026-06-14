import { Shield, TrendingUp, TrendingDown } from "lucide-react";
import type { ComplianceAreaScore } from "@/types";

interface ComplianceProgressBarsProps {
  scores: ComplianceAreaScore[];
}

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-400";
  return "bg-red-500";
}

function textColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function bgColor(score: number): string {
  if (score >= 80) return "bg-emerald-50";
  if (score >= 60) return "bg-amber-50";
  return "bg-red-50";
}

function statusLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Needs Attention";
  return "Critical";
}

export function ComplianceProgressBars({
  scores,
}: ComplianceProgressBarsProps) {
  if (scores.length === 0) return null;

  const avgScore = Math.round(
    scores.reduce((sum, s) => sum + s.score, 0) / scores.length,
  );

  return (
    <div className="space-y-4">
      {/* Overall score header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4.5 w-4.5 text-[#0077b6]" />
          <h3 className="text-sm font-semibold text-gray-900">
            Compliance Score Breakdown
          </h3>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bgColor(avgScore)} ${textColor(avgScore)}`}
        >
          {avgScore >= 80 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          Overall: {avgScore}%
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        {scores.map((area) => (
          <div key={area.area_name} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-gray-700">
                  {area.area_name}
                </span>
                <span className="text-[10px] text-gray-400">
                  {area.regulation}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${bgColor(area.score)} ${textColor(area.score)}`}
                >
                  {statusLabel(area.score)}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${textColor(area.score)}`}
                >
                  {area.score}
                </span>
              </div>
            </div>
            {/* Bar track */}
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor(area.score)}`}
                style={{ width: `${area.score}%` }}
              />
            </div>
            {/* Citation detail on hover */}
            {area.citation_count > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {area.citation_count} citation
                {area.citation_count !== 1 ? "s" : ""} across{" "}
                {area.tags.length} F-tag{area.tags.length !== 1 ? "s" : ""} (
                {area.tags.join(", ")})
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
