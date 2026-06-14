import { Input } from "@/components/ui/input";
import { useWorkflow, type WorkflowPathway } from "./WorkflowContext";

export function PathwayEditForm({
  pathway,
  pathwayIndex,
}: {
  pathway: WorkflowPathway;
  pathwayIndex: number;
}) {
  const { withWorkflow } = useWorkflow();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Pathway Title
        </label>
        <Input
          value={pathway.title}
          onChange={(e) =>
            withWorkflow((w) => {
              w.pathways[pathwayIndex].title = e.target.value;
            })
          }
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Pathway Slug
        </label>
        <Input
          value={pathway.slug}
          onChange={(e) =>
            withWorkflow((w) => {
              w.pathways[pathwayIndex].slug = e.target.value;
            })
          }
        />
      </div>

      <label className="inline-flex w-auto items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={pathway.is_active !== false}
          onChange={(e) =>
            withWorkflow((w) => {
              w.pathways[pathwayIndex].is_active = e.target.checked;
            })
          }
          className="h-4 w-4 shrink-0 p-0 rounded border-gray-300 accent-[#0077b6]"
        />
        Active Pathway
      </label>
    </div>
  );
}
