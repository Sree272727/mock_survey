import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { PathwayPopularityItem } from "@/types";

type Props = { data: PathwayPopularityItem[] };

function getColor(rate: number): string {
  if (rate >= 70) return "#10b981";
  if (rate >= 40) return "#f59e0b";
  return "#ef4444";
}

interface ContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  usage_count?: number;
  completion_rate?: number;
}

function CustomContent(props: ContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, usage_count, completion_rate } = props;
  if (width < 40 || height < 30) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={getColor(completion_rate ?? 0)}
        fillOpacity={0.85}
        stroke="#fff"
        strokeWidth={2}
      />
      {width > 70 && height > 44 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontSize={12}
            fontWeight={600}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.85)"
            fontSize={11}
          >
            {usage_count} uses
          </text>
        </>
      )}
    </g>
  );
}

export function PathwayPopularityTreemap({ data }: Props) {
  const treeData = data.map((d) => ({
    name: d.pathway_title,
    size: d.usage_count,
    usage_count: d.usage_count,
    completion_rate: d.completion_rate,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 h-full">
      <h3 className="text-sm font-semibold text-gray-800">
        Pathway Popularity
      </h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        Block size = usage count &middot; Color = completion rate
      </p>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-[10px] text-gray-500">&ge;70%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span className="text-[10px] text-gray-500">&ge;40%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className="text-[10px] text-gray-500">&lt;40%</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <Treemap
          data={treeData}
          dataKey="size"
          stroke="#fff"
          content={<CustomContent />}
        >
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const d = payload[0].payload as {
                name: string;
                usage_count: number;
                completion_rate: number;
              };
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                  <p className="font-semibold text-gray-800">{d.name}</p>
                  <p className="text-gray-500 mt-0.5">
                    {d.usage_count} uses &middot; {d.completion_rate.toFixed(0)}% completed
                  </p>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
