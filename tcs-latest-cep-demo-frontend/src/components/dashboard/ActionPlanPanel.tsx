import { useState } from "react";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import type { ActionPlanItem } from "@/types";

const PAGE_SIZE = 5;

interface ActionPlanPanelProps {
  plans: ActionPlanItem[];
  showHeading?: boolean;
}

export function ActionPlanPanel({ plans, showHeading = true }: ActionPlanPanelProps) {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(plans.length / PAGE_SIZE);
  const paginatedPlans = plans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (plans.length === 0) {
    return (
      <div>
        {showHeading && (
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recommended Action Plans</h3>
        )}
        <p className="text-sm text-gray-400 py-6 text-center">
          No action plans needed. Great job!
        </p>
      </div>
    );
  }

  return (
    <div>
      {showHeading && (
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Recommended Action Plans
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({plans.length} total)
          </span>
        </h3>
      )}
      <div className="space-y-2.5">
        {paginatedPlans.map((plan) => (
          <div
            key={plan.tag}
            className="rounded-lg border border-gray-200 p-3 border-l-4 border-l-amber-400"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-900">{plan.tag}</span>
                <span className="text-sm text-gray-600">{plan.title}</span>
              </div>
              <Badge
                variant="secondary"
                className="bg-red-50 text-red-700 border-0 text-xs flex-shrink-0"
              >
                {plan.citation_count} citation{plan.citation_count !== 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-gray-400">{plan.regulation}</p>
            <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{plan.recommendation}</p>
          </div>
        ))}
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
