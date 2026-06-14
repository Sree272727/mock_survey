import { useState } from "react";
import type { HeatMapCell, FTagCitation } from "@/types";

const F_TAG_TITLES: Record<string, string> = {
  F636: "Comprehensive Assessments",
  F637: "Significant Change Assessment",
  F641: "Accuracy of Assessments",
  F655: "Baseline Care Plan",
  F656: "Comprehensive Care Plans",
  F657: "Care Plan Revision",
  F684: "Professional Standards",
  F600: "Free from Abuse/Neglect",
  F606: "Staff Hiring/Reporting",
  F607: "Abuse Prevention Policies",
  F609: "Reporting Violations",
  F610: "Investigation/Corrective Action",
  F880: "Infection Prevention",
  F943: "Staff Training Program",
  F947: "Nurse Aide In-service",
};

const AREA_ORDER = [
  "Assessment",
  "Care Planning",
  "Quality of Care",
  "Abuse / Neglect",
  "Infection Control",
  "Training",
];

function cellBg(count: number): string {
  if (count === 0) return "bg-emerald-400";
  if (count <= 2) return "bg-amber-400";
  return "bg-red-500";
}

function cellTextColor(count: number): string {
  if (count === 0) return "text-emerald-950";
  if (count <= 2) return "text-amber-950";
  return "text-white";
}

interface ComplianceHeatMapProps {
  heatMapData: HeatMapCell[];
  ftagCitations?: FTagCitation[];
  showHeading?: boolean;
}

export function ComplianceHeatMap({ heatMapData, showHeading = true }: ComplianceHeatMapProps) {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Group by area
  const grouped = new Map<string, HeatMapCell[]>();
  for (const cell of heatMapData) {
    const list = grouped.get(cell.area_name) ?? [];
    list.push(cell);
    grouped.set(cell.area_name, list);
  }

  const areas = AREA_ORDER.filter((a) => grouped.has(a));

  return (
    <div>
      {showHeading && (
        <h3 className="text-sm font-semibold text-gray-900 mb-2">F-Tag Heat Map</h3>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {areas.map((area) => {
              const cells = grouped.get(area) ?? [];
              return (
                <tr key={area} className="group">
                  <td className="py-1 pr-3 text-[11px] font-medium text-gray-500 whitespace-nowrap align-middle w-[110px]">
                    {area}
                  </td>
                  <td className="py-1">
                    <div className="flex gap-1">
                      {cells.map((cell) => (
                        <div
                          key={cell.tag}
                          className={`relative rounded px-1.5 py-0.5 text-center cursor-default transition-all ${cellBg(cell.count)} ${cellTextColor(cell.count)} ${hoveredTag === cell.tag ? "ring-2 ring-[#0077b6] shadow-md scale-105" : "hover:scale-105"}`}
                          style={{ minWidth: 44 }}
                          onMouseEnter={() => setHoveredTag(cell.tag)}
                          onMouseLeave={() => setHoveredTag(null)}
                        >
                          <p className="text-[10px] font-semibold leading-tight opacity-80">
                            {cell.tag}
                          </p>
                          <p className="text-sm font-bold leading-tight">
                            {cell.count}
                          </p>

                          {hoveredTag === cell.tag && (
                            <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none">
                              <p className="font-semibold">{F_TAG_TITLES[cell.tag] ?? cell.tag}</p>
                              <p className="text-gray-300 text-[10px]">
                                {cell.count} citation{cell.count !== 1 ? "s" : ""}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Compact legend */}
      <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-gray-100">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Citations:</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> 0
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> 1–2
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> 3+
        </span>
      </div>
    </div>
  );
}
