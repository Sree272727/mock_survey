import { useMemo } from "react";
import type { DailyActivity } from "@/types";

type Props = { data: DailyActivity[] };

function getColor(count: number): string {
  if (count === 0) return "#f3f4f6"; // gray-100
  if (count === 1) return "#a7f3d0"; // emerald-200
  if (count <= 3) return "#34d399"; // emerald-400
  return "#059669"; // emerald-600
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function ActivityCalendarHeatmap({ data }: Props) {
  const { weeks, monthLabels } = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) {
      map.set(d.date, d.count);
    }

    // Build 90-day range ending today
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 89);

    // Align to the start of the week (Sunday)
    const alignedStart = new Date(startDate);
    alignedStart.setDate(alignedStart.getDate() - alignedStart.getDay());

    const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];
    const monthLabels: { label: string; weekIdx: number }[] = [];
    let lastMonth = -1;
    let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];

    const cursor = new Date(alignedStart);
    while (cursor <= today || currentWeek.length > 0) {
      if (cursor > today && currentWeek.length > 0) {
        weeks.push(currentWeek);
        break;
      }

      const iso = cursor.toISOString().slice(0, 10);
      const dayOfWeek = cursor.getDay();
      const month = cursor.getMonth();

      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      // Track month labels
      if (month !== lastMonth) {
        const monthName = cursor.toLocaleDateString("en-US", { month: "short" });
        monthLabels.push({ label: monthName, weekIdx: weeks.length });
        lastMonth = month;
      }

      const isInRange = cursor >= startDate && cursor <= today;
      currentWeek.push({
        date: iso,
        count: isInRange ? (map.get(iso) || 0) : -1,
        dayOfWeek,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    if (currentWeek.length > 0 && !weeks.includes(currentWeek)) {
      weeks.push(currentWeek);
    }

    return { weeks, monthLabels };
  }, [data]);

  const totalSurveys = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Activity Calendar
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Daily survey submissions &middot; Last 90 days
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-0.5">
          {totalSurveys} total
        </span>
      </div>

      {/* Month labels */}
      <div className="flex ml-7 mb-1">
        {monthLabels.map((m, i) => {
          const nextIdx = monthLabels[i + 1]?.weekIdx ?? weeks.length;
          const span = nextIdx - m.weekIdx;
          return (
            <div
              key={`${m.label}-${i}`}
              style={{ width: span * 16 }}
              className="text-[10px] text-gray-400"
            >
              {m.label}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex gap-0">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] mr-1.5 pt-0">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="h-[12px] w-5 text-[9px] text-gray-400 leading-[12px] text-right pr-0.5"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex gap-[2px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day) => (
                <div
                  key={day.date}
                  className="w-[12px] h-[12px] rounded-[2px] transition-colors group relative"
                  style={{
                    backgroundColor:
                      day.count < 0 ? "transparent" : getColor(day.count),
                  }}
                  title={
                    day.count >= 0
                      ? `${day.date}: ${day.count} survey${day.count !== 1 ? "s" : ""}`
                      : undefined
                  }
                >
                  {/* Tooltip */}
                  {day.count >= 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                      <div className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                        {day.date}: {day.count} survey{day.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-gray-400">Less</span>
        {[0, 1, 2, 4].map((v) => (
          <div
            key={v}
            className="w-[10px] h-[10px] rounded-[2px]"
            style={{ backgroundColor: getColor(v) }}
          />
        ))}
        <span className="text-[10px] text-gray-400">More</span>
      </div>
    </div>
  );
}
