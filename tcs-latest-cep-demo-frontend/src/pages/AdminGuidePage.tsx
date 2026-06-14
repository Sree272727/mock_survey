import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Layers,
  GitBranch,
  Wrench,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Package,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Accordion                                                          */
/* ------------------------------------------------------------------ */

function Section({
  icon: Icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="h-9 w-9 rounded-lg bg-[#edf5fc] flex items-center justify-center shrink-0">
          <Icon className="h-[18px] w-[18px] text-[#0077b6]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-gray-900">{title}</p>
          <p className="text-[12px] text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step block                                                         */
/* ------------------------------------------------------------------ */

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 mt-4 first:mt-3">
      <div className="h-6 w-6 rounded-full bg-[#0077b6] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900">{title}</p>
        <div className="text-[13px] text-gray-600 leading-relaxed mt-1 space-y-1.5">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tip block                                                          */
/* ------------------------------------------------------------------ */

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 mt-3 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
      <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-[12px] text-amber-800 leading-relaxed">{children}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Flow diagram                                                       */
/* ------------------------------------------------------------------ */

function FlowDiagram({ items }: { items: string[] }) {
  return (
    <div className="flex items-center flex-wrap gap-1.5 mt-2 mb-1">
      {items.map((item, i) => (
        <span key={i} className="contents">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#edf5fc] text-[#0077b6] text-[11px] font-medium border border-[#c7ddf0]">
            {item}
          </span>
          {i < items.length - 1 && (
            <ArrowRight className="h-3 w-3 text-gray-300 shrink-0" />
          )}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminGuidePage() {
  return (
    <div className="space-y-5 max-w-[820px]">
      {/* Header */}
      <div>
        <h2 className="text-[26px] font-bold text-foreground tracking-tight">
          Administrator Guide
        </h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Step-by-step instructions for configuring surveys, pathways, and compliance rules
        </p>
      </div>

      {/* Overview card */}
      <div className="bg-gradient-to-br from-[#edf5fc] to-[#e0eefa] rounded-xl border border-[#c7ddf0] p-5">
        <p className="text-[14px] font-semibold text-[#0077b6] mb-2">How Everything Connects</p>
        <p className="text-[13px] text-gray-700 leading-relaxed mb-3">
          The platform uses a layered structure to build surveys. Think of it like building blocks:
          individual <strong>Questions</strong> are grouped into <strong>Sections</strong>, sections
          form a <strong>Pathway</strong>, and pathways are bundled into a <strong>Template</strong> that
          defines a complete survey type.
        </p>
        <FlowDiagram items={["Questions", "Sections", "Pathways", "Templates", "Live Survey"]} />
        <p className="text-[12px] text-gray-500 mt-2">
          The <strong>Workflow Builder</strong> is where you wire everything together with branching logic and rules.
          Use <strong>CMS Question Packs</strong> to import pre-built pathways instantly.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-3">

        {/* 1. Question Library */}
        <Section
          icon={CircleDot}
          title="1. Question Library"
          subtitle="Create and manage your master collection of survey questions"
          defaultOpen
        >
          <p className="text-[13px] text-gray-600 leading-relaxed mt-2">
            The Question Library is your central repository for all survey questions. Every question you create
            here can be reused across multiple pathways and templates.
          </p>

          <Step number={1} title="Navigate to the Question Library">
            <p>
              From the sidebar, click <strong>Question Library</strong> under Content Management. You'll see
              a dashboard showing total questions, pathways, decision nodes, and unique citations.
            </p>
          </Step>

          <Step number={2} title="Add a New Question">
            <p>
              Click the <strong>+ Add Question</strong> button in the top-right. A form will appear with these fields:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong>Code</strong> — A unique identifier (e.g., <code className="text-[12px] bg-gray-100 px-1.5 py-0.5 rounded">gen_obs_1</code>). Use a naming convention like <code className="text-[12px] bg-gray-100 px-1.5 py-0.5 rounded">pathway_section_number</code>.</li>
              <li><strong>Type</strong> — Choose <em>question</em> for regular survey items, or <em>decision</em> for summary/conclusion nodes.</li>
              <li><strong>Pathway</strong> — Which pathway this question belongs to (General CEP, Neglect CEP, or Infection Control).</li>
              <li><strong>Section</strong> — The section within the pathway (e.g., Observations, Record Review).</li>
              <li><strong>Prompt</strong> — The actual question text that surveyors will see.</li>
              <li><strong>Citations</strong> — Regulatory references like F-tags (e.g., <code className="text-[12px] bg-gray-100 px-1.5 py-0.5 rounded">F684, F655</code>), separated by commas.</li>
            </ul>
          </Step>

          <Step number={3} title="Search and Filter">
            <p>
              Use the search bar to find questions by code, prompt text, or citation. The pathway dropdown
              lets you filter to just one pathway at a time.
            </p>
          </Step>

          <Step number={4} title="Edit or Delete">
            <p>
              Click the pencil icon to edit any question, or the trash icon to delete. Deleting is permanent
              and you'll be asked to confirm.
            </p>
          </Step>

          <Tip>
            Use consistent naming conventions for codes. For example: <code className="text-[12px] bg-amber-100/60 px-1 py-0.5 rounded">gen_obs_1</code> means
            General pathway, Observations section, question 1. This makes it much easier to reference questions
            in branching rules later.
          </Tip>
        </Section>

        {/* 2. Templates */}
        <Section
          icon={Layers}
          title="2. Survey Templates"
          subtitle="Bundle pathways into reusable survey configurations"
        >
          <p className="text-[13px] text-gray-600 leading-relaxed mt-2">
            Templates define the structure of a complete survey. Each template specifies which pathways
            are included, making it easy to create different survey types (Annual Recertification, Complaint
            Investigation, etc.).
          </p>

          <Step number={1} title="Navigate to Templates">
            <p>
              Click <strong>Templates</strong> in the sidebar. You'll see a dashboard with template counts
              by status (Published vs. Draft).
            </p>
          </Step>

          <Step number={2} title="Create a New Template">
            <p>Click <strong>+ Add Template</strong> and fill in:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong>Name</strong> — A descriptive name (e.g., "Annual Recertification Survey").</li>
              <li><strong>Description</strong> — Brief summary of when this template should be used.</li>
              <li><strong>Version</strong> — Version number for tracking changes (e.g., 1.0, 2.1).</li>
              <li><strong>Status</strong> — Set to <em>Draft</em> while building, then change to <em>Published</em> when ready for use.</li>
              <li><strong>Pathways</strong> — Check which pathways to include. Most surveys include all three (General CEP, Neglect CEP, and Infection Control).</li>
            </ul>
          </Step>

          <Step number={3} title="Manage Template Lifecycle">
            <p>
              Keep templates in <strong>Draft</strong> status while making changes. Once reviewed and approved,
              switch to <strong>Published</strong> to make them available for creating new surveys. You can
              always go back to Draft if further changes are needed.
            </p>
          </Step>

          <Tip>
            Increment the version number each time you make significant changes to a published template.
            This helps track which version was used for each survey.
          </Tip>
        </Section>

        {/* 3. Pathways */}
        <Section
          icon={GitBranch}
          title="3. Pathways"
          subtitle="Define Critical Element Pathways with sections and citations"
        >
          <p className="text-[13px] text-gray-600 leading-relaxed mt-2">
            Pathways are the core assessment workflows. Each pathway represents a CMS Critical Element
            Pathway (CEP) and contains sections of related questions. This is where you define the overall
            structure and regulatory mappings.
          </p>

          <Step number={1} title="Navigate to Pathways">
            <p>
              Click <strong>Pathways</strong> in the sidebar. You'll see all existing pathways with their
              sections, question counts, and citation mappings.
            </p>
          </Step>

          <Step number={2} title="Create a New Pathway">
            <p>Click <strong>+ Add Pathway</strong> and fill in:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong>Name</strong> — The full pathway name (e.g., "General Critical Element Pathway").</li>
              <li><strong>Slug</strong> — A URL-friendly identifier (e.g., <code className="text-[12px] bg-gray-100 px-1.5 py-0.5 rounded">general-cep</code>). Use lowercase with hyphens.</li>
              <li><strong>CMS Reference</strong> — The official CMS form number (e.g., CMS-20072).</li>
              <li><strong>Status</strong> — Active means the pathway is available for use in surveys.</li>
              <li><strong>Citations</strong> — All F-tag citations associated with this pathway.</li>
              <li><strong>Branching Logic</strong> — A description of how sections should appear conditionally (configured in detail via the Workflow Builder).</li>
            </ul>
          </Step>

          <Step number={3} title="View Section Details">
            <p>
              Click the expand arrow on any pathway row to see its sections. Each section shows its question count
              and whether it's always visible or conditional (shown only when a specific condition is met).
            </p>
          </Step>

          <Tip>
            The Pathways page gives you a high-level overview. For detailed editing of sections, questions,
            and branching rules, use the <strong>Workflow Builder</strong> (covered next).
          </Tip>
        </Section>

        {/* 4. Workflow Builder */}
        <Section
          icon={Wrench}
          title="4. Workflow Builder"
          subtitle="Advanced configuration with branching logic and conditional display"
        >
          <p className="text-[13px] text-gray-600 leading-relaxed mt-2">
            The Workflow Builder is the most powerful tool in the platform. It lets you drill into pathways,
            edit sections and questions in detail, and configure the branching logic that controls which
            sections appear based on surveyor answers.
          </p>

          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-[12px] font-semibold text-gray-700 mb-1">Navigation Structure</p>
            <FlowDiagram items={["Pathways List", "Sections in Pathway", "Questions in Section"]} />
            <p className="text-[12px] text-gray-500 mt-1.5">Click into any row to drill deeper. Use the breadcrumb trail at the top to navigate back.</p>
          </div>

          <Step number={1} title="Open the Workflow Builder">
            <p>
              Click <strong>Workflow Builder</strong> in the sidebar under Advanced Tools. You'll see a list
              of all pathways. Click any pathway to see its sections, then click a section to see its questions.
            </p>
          </Step>

          <Step number={2} title="Edit a Pathway">
            <p>
              Click the pencil icon next to a pathway to open the edit drawer. You can change the title, slug,
              and active status. Click <strong>Save</strong> to apply changes.
            </p>
          </Step>

          <Step number={3} title="Manage Sections">
            <p>
              After clicking into a pathway, you'll see all its sections. Each section shows:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong>Title & Slug</strong> — Section name and identifier.</li>
              <li><strong>Question Count</strong> — How many questions are in this section.</li>
              <li><strong>Visibility</strong> — Shows "Always visible" or a condition like "When gen_obs_1 = Yes".</li>
            </ul>
            <p className="mt-1">Click <strong>+ Add Section</strong> to create a new section.</p>
          </Step>

          <Step number={4} title="Configure Conditional Display (Branching Logic)">
            <p>
              This is the key feature. To make a section appear only when a specific answer is given:
            </p>
            <ol className="list-decimal pl-4 mt-1 space-y-1.5">
              <li>Click the <strong>pencil icon</strong> on the section you want to make conditional.</li>
              <li>In the edit drawer, find the <strong>Section Visibility</strong> area.</li>
              <li>Change <strong>Display Mode</strong> from "Always visible" to a question code (e.g., "Show when gen_obs_1").</li>
              <li>Set <strong>When Answer Is</strong> to the specific choice (e.g., "No").</li>
              <li>Click <strong>Save</strong>.</li>
            </ol>
            <p className="mt-1.5">
              Now that section will only appear during a survey when the surveyor answers "No" to the
              referenced question. This creates dynamic, branching survey flows.
            </p>
          </Step>

          <Step number={5} title="Edit Questions">
            <p>
              Click into a section to see all its questions. For each question you can edit:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong>Code</strong> — The unique question identifier.</li>
              <li><strong>Node Type</strong> — "question" for regular items, "decision" for summary conclusions.</li>
              <li><strong>Prompt</strong> — The question text surveyors will read.</li>
              <li><strong>Choices</strong> — Answer options separated by commas (e.g., "Yes, No").</li>
              <li><strong>Parent Node Code</strong> — Links to a parent question for sub-question behavior.</li>
              <li><strong>Rules</strong> — Read-only summary showing any branching rules attached to this question.</li>
            </ul>
          </Step>

          <Step number={6} title="Apply Changes">
            <p>
              After making all your edits, click the <strong>Apply Changes</strong> button in the top toolbar.
              This deploys your configuration to the live system.
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>If active surveys exist, you'll see a confirmation dialog showing how many cases and answers are in the system.</li>
              <li>The <strong>"Reset runtime case data"</strong> checkbox (checked by default) will clear all active survey data when applying. Uncheck this only if you're sure your changes won't break existing surveys.</li>
              <li>Click <strong>Continue</strong> to confirm and apply.</li>
            </ul>
          </Step>

          <Tip>
            Always test your branching logic after applying changes. Start a new survey in LTC Customer
            mode and walk through the pathway to verify that conditional sections appear and hide correctly
            based on your answers.
          </Tip>
        </Section>

        {/* 5. CMS Question Packs */}
        <Section
          icon={Package}
          title="5. CMS Question Packs"
          subtitle="Import pre-built CMS pathway question sets with one click"
        >
          <p className="text-[13px] text-gray-600 leading-relaxed mt-2">
            CMS Question Packs are pre-built collections of survey questions based on real CMS regulatory guidance.
            Each pack includes a complete pathway with sections, questions, F-tag citations, and branching logic —
            ready to import and use immediately.
          </p>

          <Step number={1} title="Find the CMS Question Packs">
            <p>
              Navigate to the <strong>Workflow Builder</strong> page. Scroll down below the Pathways table to find
              the <strong>CMS Question Packs</strong> section. Available packs are displayed as cards with their
              name, description, section/question counts, and F-tag badges.
            </p>
          </Step>

          <Step number={2} title="Preview a Pack Before Importing">
            <p>
              Click the <strong>Preview</strong> button on any pack card to open a detailed modal showing:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong>All questions</strong> organized by section, with their codes and prompt text.</li>
              <li><strong>F-tag badges</strong> showing which regulatory citations are mapped to each question.</li>
              <li><strong>Type indicators</strong> — which items are regular questions vs. decision nodes.</li>
              <li><strong>Flag indicators</strong> — which questions may trigger survey alerts when answered.</li>
            </ul>
            <p className="mt-1.5">
              Use the preview to verify the pack contents match your needs before importing.
            </p>
          </Step>

          <Step number={3} title="Import a Pack">
            <p>
              Click the <strong>Import</strong> button on the pack card. A confirmation dialog will appear explaining
              what will happen:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>The pack is added as a <strong>new pathway</strong> in the Workflow Builder.</li>
              <li>Existing pathways are <strong>not affected</strong> — nothing is overwritten or changed.</li>
              <li>The imported pathway starts as <strong>Inactive</strong> by default.</li>
            </ul>
            <p className="mt-1.5">
              Click <strong>Import Pack</strong> to confirm. The pathway appears in your Pathways table
              and the Import button changes to "Imported."
            </p>
          </Step>

          <Step number={4} title="Activate and Use the Imported Pathway">
            <p>
              After importing, you may want to:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Click into the imported pathway in the Workflow Builder to review and customize questions.</li>
              <li>Edit the pathway properties and set its status to <strong>Active</strong> when ready.</li>
              <li>Add the pathway to a <strong>Template</strong> so it becomes available when creating new surveys.</li>
              <li>Click <strong>Apply Changes</strong> to deploy the updated configuration.</li>
            </ul>
          </Step>

          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-[12px] font-semibold text-gray-700 mb-2">Available Packs</p>
            <div className="space-y-2 text-[12px] text-gray-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p><strong>General CEP 2026</strong> — 18 questions across 5 sections covering quality of care observations, record review, harm determination, and critical element decisions. Includes 12 F-tag citations.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                <p><strong>Neglect CEP</strong> — Coming soon. Will cover interviews, investigation, supervisory staff, and QA review.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                <p><strong>Infection Control</strong> — Coming soon. Will cover prevention practices, surveillance, physician orders, and harm evaluation.</p>
              </div>
            </div>
          </div>

          <Tip>
            CMS Question Packs save hours of manual data entry. Instead of creating 18+ questions one by one,
            import the pack and customize as needed. Each pack is based on real CMS regulatory guidance so
            the questions, citations, and branching logic are already mapped correctly.
          </Tip>
        </Section>

        {/* 6. Branching Logic Deep Dive */}
        <Section
          icon={GitBranch}
          title="6. Understanding Branching Logic"
          subtitle="How conditional display and rules work behind the scenes"
        >
          <p className="text-[13px] text-gray-600 leading-relaxed mt-2">
            Branching logic is what makes surveys dynamic. Instead of showing every question to every surveyor,
            you can show or hide entire sections based on how earlier questions are answered.
          </p>

          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-[12px] font-semibold text-gray-700 mb-2">Example: Harm Determination</p>
            <div className="space-y-2 text-[12px] text-gray-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#0077b6] shrink-0 mt-0.5" />
                <p><strong>Section 1: Observations</strong> — Always visible. Contains the question: "Does staff consistently implement care-planned interventions?"</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#0077b6] shrink-0 mt-0.5" />
                <p>If the surveyor answers <strong>"No"</strong> to any observation question...</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p><strong>Section 2: Harm Determination</strong> — Conditionally appears, asking about severity and scope of the deficiency.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                <p>If the surveyor answers <strong>"Yes"</strong> (no deficiency found), the Harm section stays <em>hidden</em> and the survey moves forward.</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[13px] font-semibold text-gray-900 mb-1.5">How Rules Are Structured</p>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              Each rule follows a simple pattern:
            </p>
            <div className="mt-2 p-3 bg-[#edf5fc] rounded-lg border border-[#c7ddf0] font-mono text-[12px] text-[#0077b6]">
              WHEN [Question Code] answer = [Choice] THEN show [Section]
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed mt-2">
              For example: <em>"When gen_obs_1 answer = No, then show the Harm Determination section."</em>
            </p>
            <p className="text-[13px] text-gray-600 leading-relaxed mt-1.5">
              You don't need to write these rules manually. The Workflow Builder creates them automatically
              when you set a section's visibility to depend on a specific question and answer combination.
            </p>
          </div>

          <div className="mt-4">
            <p className="text-[13px] font-semibold text-gray-900 mb-1.5">Sub-Questions (Parent Node)</p>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              Questions can also have a <strong>Parent Node Code</strong>. When set, the question only appears
              if its parent question was answered with "No." This creates inline sub-questions that appear
              beneath the parent — different from section-level branching which shows/hides entire groups of questions.
            </p>
          </div>

          <Tip>
            Think of branching at two levels: <strong>Section-level</strong> (show/hide entire sections based on a trigger question)
            and <strong>Question-level</strong> (sub-questions that appear based on parent answer). Use section-level
            for major workflow branches, and question-level for follow-up detail questions.
          </Tip>
        </Section>

        {/* 7. Putting It All Together */}
        <Section
          icon={BookOpen}
          title="7. Putting It All Together"
          subtitle="End-to-end walkthrough of building a complete survey workflow"
        >
          <p className="text-[13px] text-gray-600 leading-relaxed mt-2">
            Here's a complete example of building a new survey workflow from scratch:
          </p>

          <Step number={1} title="Plan Your Survey Structure">
            <p>
              Before touching the platform, sketch out your survey on paper:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>What sections do you need? (e.g., Observations, Record Review, Interviews)</li>
              <li>What questions go in each section?</li>
              <li>Which sections should be conditional? What triggers them?</li>
              <li>What F-tag citations apply to each question?</li>
            </ul>
          </Step>

          <Step number={2} title="Add Questions to the Library">
            <p>
              Go to <strong>Question Library</strong> and add all your questions. Give each one a clear code,
              descriptive prompt, and relevant citations. This builds your reusable question bank.
            </p>
            <p className="mt-1">
              <strong>Shortcut:</strong> If a <strong>CMS Question Pack</strong> matches your pathway, import it
              from the Workflow Builder page instead — this adds a complete pathway with all questions, sections,
              citations, and branching logic pre-configured.
            </p>
          </Step>

          <Step number={3} title="Build the Pathway in Workflow Builder">
            <p>
              Go to <strong>Workflow Builder</strong>. Create or edit a pathway, add your sections,
              and populate each section with questions. Set up any conditional display rules on sections.
            </p>
          </Step>

          <Step number={4} title="Configure Branching Rules">
            <p>
              For each section that should appear conditionally, edit it and set the Display Mode to
              reference a trigger question and answer. Test the logic mentally: "If the surveyor answers X
              to this question, should this section appear?"
            </p>
          </Step>

          <Step number={5} title="Create or Update the Template">
            <p>
              Go to <strong>Templates</strong> and create a new template (or update an existing one). Make
              sure your pathway is checked. Set the status to <em>Published</em> when ready.
            </p>
          </Step>

          <Step number={6} title="Apply and Test">
            <p>
              Back in the <strong>Workflow Builder</strong>, click <strong>Apply Changes</strong> to deploy.
              Then switch to <strong>LTC Customer</strong> mode, create a new survey, and walk through the entire
              pathway to verify everything works — questions appear in the right order, conditional sections show/hide
              correctly, and citations are properly tagged.
            </p>
          </Step>

          <Tip>
            Always test with both "Yes" and "No" answers to trigger all branches. It's easy to miss
            a broken conditional path if you only test the "happy path."
          </Tip>
        </Section>
      </div>
    </div>
  );
}
