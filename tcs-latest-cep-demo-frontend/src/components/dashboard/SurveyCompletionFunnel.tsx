import type { FunnelStep } from "@/types";

type Props = { data: FunnelStep[] };

const COLORS = ["#3b82f6", "#60a5fa", "#10b981", "#f59e0b"];

export function SurveyCompletionFunnel({ data }: Props) {
  const maxValue = data.length > 0 ? data[0].value : 1;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 h-full">
      <h3 className="text-sm font-semibold text-gray-800">
        Survey Completion Funnel
      </h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-5">
        Drop-off across survey lifecycle stages
      </p>

      <div className="flex flex-col items-center gap-1.5">
        {data.map((step, idx) => {
          const widthPct = maxValue > 0 ? (step.value / maxValue) * 100 : 100;
          const minWidth = 25;
          const finalWidth = Math.max(widthPct, minWidth);

          return (
            <div key={step.name} className="w-full flex flex-col items-center">
              {/* Bar */}
              <div
                className="rounded-md flex items-center justify-center py-4 transition-all relative group"
                style={{
                  width: `${finalWidth}%`,
                  backgroundColor: COLORS[idx % COLORS.length],
                  minHeight: 52,
                }}
              >
                <div className="text-center">
                  <span className="text-white text-lg font-bold">
                    {step.value}
                  </span>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                    {step.name}: {step.value} surveys
                    {idx > 0 && data[idx - 1].value > 0 && (
                      <> ({Math.round((step.value / data[idx - 1].value) * 100)}% of prev)</>
                    )}
                  </div>
                </div>
              </div>

              {/* Label below */}
              <span className="text-xs font-semibold text-gray-600 mt-1">
                {step.name}
              </span>

              {/* Drop-off indicator between steps */}
              {idx < data.length - 1 && data[idx].value > 0 && (
                <div className="text-[10px] text-gray-400 mt-0.5 mb-0.5">
                  ↓ {data[idx].value - data[idx + 1].value} drop-off
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
