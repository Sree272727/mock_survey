import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { getFacilityDashboard } from "@/api";
import type { FacilityDashboard } from "@/types";
import { DashboardCards } from "@/components/dashboard/DashboardCards";
import { ComplianceGauges } from "@/components/dashboard/ComplianceGauges";
import { ComplianceHeatMap } from "@/components/dashboard/ComplianceHeatMap";
import { ActionPlanPanel } from "@/components/dashboard/ActionPlanPanel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SURVEY_PAGE_SIZE = 10;

export default function FacilityDashboardPage() {
  const { facilityName } = useParams<{ facilityName: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(facilityName ?? "");

  const [data, setData] = useState<FacilityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyPage, setSurveyPage] = useState(1);

  useEffect(() => {
    if (!decoded) return;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await getFacilityDashboard(decoded);
        setData(result);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [decoded]);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-400">No data.</p>;

  const surveyPageCount = Math.ceil(data.cases.length / SURVEY_PAGE_SIZE);
  const paginatedCases = data.cases.slice(
    (surveyPage - 1) * SURVEY_PAGE_SIZE,
    surveyPage * SURVEY_PAGE_SIZE
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate("/app/dashboard-overview")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-[26px] font-bold text-foreground tracking-tight">
            {data.facility_name}
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Facility compliance details
          </p>
        </div>
      </div>

      <DashboardCards
        deficiencies={data.deficiencies}
        actionItems={data.action_items}
        surveysCompleted={data.surveys_completed}
        totalCases={data.total_cases}
        inProgress={data.in_progress_cases}
        completed={data.completed_cases}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <Tabs defaultValue="compliance">
          <div className="px-5 pt-3">
            <TabsList>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="actions">Action Plans</TabsTrigger>
              <TabsTrigger value="surveys">
                Surveys
                <span className="ml-1.5 text-xs text-gray-400">
                  ({data.cases.length})
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="compliance" className="px-5 pb-5">
            <ComplianceGauges scores={data.compliance_area_scores} />
            <div className="mt-5">
              <ComplianceHeatMap heatMapData={data.heat_map_data} />
            </div>
          </TabsContent>

          <TabsContent value="actions" className="px-5 pb-5">
            <ActionPlanPanel plans={data.action_plans} />
          </TabsContent>

          <TabsContent value="surveys" className="pb-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                    Case ID
                  </TableHead>
                  <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                    Resident
                  </TableHead>
                  <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-center">
                    Status
                  </TableHead>
                  <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-center">
                    Citations
                  </TableHead>
                  <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                    Created
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-gray-400">
                      No surveys for this facility.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCases.map((c) => (
                    <TableRow key={c.id} className="hover:bg-gray-50/50">
                      <TableCell className="py-3 px-5 text-sm font-medium text-gray-900">
                        {c.external_case_id}
                      </TableCell>
                      <TableCell className="py-3 px-5 text-sm text-gray-600">
                        {c.resident_id}
                      </TableCell>
                      <TableCell className="py-3 px-5 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            c.status === "completed"
                              ? "bg-emerald-50 text-emerald-700 border-0 text-xs"
                              : "bg-blue-50 text-blue-700 border-0 text-xs"
                          }
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-5 text-sm text-center">
                        <span className={c.citation_count > 0 ? "text-red-600 font-medium" : "text-gray-500"}>
                          {c.citation_count}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-5 text-sm text-gray-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="px-5 pb-3">
              <Pagination
                page={surveyPage}
                pageCount={surveyPageCount}
                onPageChange={setSurveyPage}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
