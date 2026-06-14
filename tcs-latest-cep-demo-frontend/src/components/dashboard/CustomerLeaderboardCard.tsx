import type { FacilityLeaderboardItem } from "@/types";

type Props = { data: FacilityLeaderboardItem[] };

const MEDAL: Record<number, { emoji: string; color: string }> = {
  0: { emoji: "🥇", color: "text-amber-500" },
  1: { emoji: "🥈", color: "text-gray-400" },
  2: { emoji: "🥉", color: "text-amber-700" },
};

export function CustomerLeaderboardCard({ data }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 h-full">
      <h3 className="text-sm font-semibold text-gray-800">
        Top Customers by Usage
      </h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        Facilities ranked by total surveys conducted
      </p>

      <div className="space-y-3">
        {data.map((item, idx) => {
          const medal = MEDAL[idx];
          const pct = item.completion_rate;

          return (
            <div
              key={item.facility_name}
              className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:bg-gray-50 transition-colors"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-8 text-center">
                {medal ? (
                  <span className="text-lg">{medal.emoji}</span>
                ) : (
                  <span className="text-xs font-bold text-gray-400">
                    #{idx + 1}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {item.facility_name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">
                    {item.survey_count} surveys
                  </span>
                  {/* Completion rate mini-bar */}
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            pct >= 70
                              ? "#10b981"
                              : pct >= 40
                                ? "#f59e0b"
                                : "#ef4444",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-500 w-9 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Citation badge */}
              {item.citation_count > 0 && (
                <span className="flex-shrink-0 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-inset ring-red-200">
                  {item.citation_count} cit.
                </span>
              )}
            </div>
          );
        })}

        {data.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            No facility data available
          </p>
        )}
      </div>
    </div>
  );
}
