import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import type { ComplianceAreaScore } from "@/types";

function scoreColor(score: number): string {
  if (score >= 80) return "#4ade80";
  if (score >= 60) return "#fbbf24";
  return "#ef4444";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-50 border-emerald-200";
  if (score >= 60) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

interface ComplianceGaugesProps {
  scores: ComplianceAreaScore[];
  showHeading?: boolean;
}

export function ComplianceGauges({ scores, showHeading = true }: ComplianceGaugesProps) {
  return (
    <div>
      {showHeading && (
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Compliance by Area</h3>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {scores.map((area) => {
          const color = scoreColor(area.score);
          const data = [{ value: area.score, fill: color }];
          return (
            <div
              key={area.area_name}
              className={`rounded-lg border p-2 flex flex-col items-center ${scoreBg(area.score)}`}
            >
              <div className="relative">
                <RadialBarChart
                  width={80}
                  height={80}
                  cx={40}
                  cy={40}
                  innerRadius={28}
                  outerRadius={38}
                  barSize={8}
                  data={data}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: "#e5e7eb" }} dataKey="value" cornerRadius={5} />
                </RadialBarChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold" style={{ color }}>
                    {area.score}
                  </span>
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-700 text-center leading-tight">
                {area.area_name}
              </p>
              <p className="text-[10px] text-gray-400">{area.regulation}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
