import { Input } from "@/components/ui/input";
import { useWorkflow, type WorkflowPathway, type WorkflowSection } from "./WorkflowContext";

export function SectionEditForm({
  pathway,
  section,
  pathwayIndex,
  sectionIndex,
}: {
  pathway: WorkflowPathway;
  section: WorkflowSection;
  pathwayIndex: number;
  sectionIndex: number;
}) {
  const {
    withWorkflow,
    allSectionNodeOptions,
    getSectionDisplayRule,
    clearSectionDisplayRules,
    setSectionDisplayRule,
  } = useWorkflow();

  const sectionRule = getSectionDisplayRule(pathway, section.slug);
  const nodeOptions = allSectionNodeOptions(pathway);
  const selectedSourceCode = sectionRule?.sourceNodeCode || "";
  const selectedSource = nodeOptions.find((n) => n.code === selectedSourceCode);
  const selectedChoice = sectionRule?.whenChoice || "";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Section Title
        </label>
        <Input
          value={section.title}
          onChange={(e) =>
            withWorkflow((w) => {
              w.pathways[pathwayIndex].sections[sectionIndex].title =
                e.target.value;
            })
          }
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Section Slug
        </label>
        <Input
          value={section.slug}
          onChange={(e) =>
            withWorkflow((w) => {
              w.pathways[pathwayIndex].sections[sectionIndex].slug =
                e.target.value;
            })
          }
        />
      </div>

      {/* Section Visibility */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-4">
        <h4 className="text-sm font-semibold text-gray-800">
          Section Visibility
        </h4>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Display Mode
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={selectedSourceCode}
            onChange={(e) => {
              const sourceCode = e.target.value;
              withWorkflow((w) => {
                const target = w.pathways[pathwayIndex];
                if (!target) return;
                if (!sourceCode) {
                  clearSectionDisplayRules(target, section.slug);
                  return;
                }
                const sourceNode = allSectionNodeOptions(target).find(
                  (n) => n.code === sourceCode,
                );
                const defaultChoice = sourceNode?.choices?.[0] || "Yes";
                setSectionDisplayRule(
                  target,
                  section.slug,
                  sourceCode,
                  defaultChoice,
                );
              });
            }}
          >
            <option value="">Always visible</option>
            {nodeOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                Show when {opt.code}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            When Answer Is
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={selectedChoice}
            disabled={!selectedSourceCode}
            onChange={(e) => {
              const nextChoice = e.target.value;
              if (!selectedSourceCode) return;
              withWorkflow((w) => {
                const target = w.pathways[pathwayIndex];
                if (!target) return;
                setSectionDisplayRule(
                  target,
                  section.slug,
                  selectedSourceCode,
                  nextChoice,
                );
              });
            }}
          >
            {!selectedSourceCode && (
              <option value="">Select display mode first</option>
            )}
            {selectedSource?.choices?.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Set to "Always visible" to remove conditional display.
          </p>
        </div>
      </div>
    </div>
  );
}
