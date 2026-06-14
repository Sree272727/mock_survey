import { useEffect, useState } from "react";
import { useMode } from "@/context/ModeContext";
import {
  getDashboardOverview,
  getFacilityDashboard,
  getDashboardFacilities,
  getSurveyFrequency,
} from "@/api";
import type {
  DashboardOverview,
  FacilityDashboard,
  FacilityListItem,
  FacilitySurveyFrequency,
} from "@/types";
import { DashboardCards } from "@/components/dashboard/DashboardCards";
import { ComplianceGauges } from "@/components/dashboard/ComplianceGauges";
import { ComplianceProgressBars } from "@/components/dashboard/ComplianceProgressBars";
import { DeficiencySummaryPanel } from "@/components/dashboard/DeficiencySummaryPanel";
import { FacilityTable } from "@/components/dashboard/FacilityTable";
import { ActionPlanPanel } from "@/components/dashboard/ActionPlanPanel";
import { SurveyFrequencyChart } from "@/components/dashboard/SurveyFrequencyChart";
import { AdminKpiCards } from "@/components/dashboard/AdminKpiCards";
import { CitationsByTagChart } from "@/components/dashboard/CitationsByTagChart";
import { ComplianceRadarChart } from "@/components/dashboard/ComplianceRadarChart";
import { SurveyStatusChart } from "@/components/dashboard/SurveyStatusChart";
import { SeverityDistributionChart } from "@/components/dashboard/SeverityDistributionChart";
import { ActionItemsChart } from "@/components/dashboard/ActionItemsChart";
import { CitationsByFacilityChart } from "@/components/dashboard/CitationsByFacilityChart";
import { PathwayCoverageChart } from "@/components/dashboard/PathwayCoverageChart";
import { SurveyActivityTrendChart } from "@/components/dashboard/SurveyActivityTrendChart";
import { CustomerLeaderboardCard } from "@/components/dashboard/CustomerLeaderboardCard";
import { PathwayPopularityTreemap } from "@/components/dashboard/PathwayPopularityTreemap";
import { SurveyCompletionFunnel } from "@/components/dashboard/SurveyCompletionFunnel";
import { ActivityCalendarHeatmap } from "@/components/dashboard/ActivityCalendarHeatmap";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardOverviewPage() {
  const { mode } = useMode();
  const isPlatform = mode === "platform";

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [surveyFreq, setSurveyFreq] = useState<FacilitySurveyFrequency[]>([]);
  const [facilities, setFacilities] = useState<FacilityListItem[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [facilityData, setFacilityData] = useState<FacilityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: platform overview or customer facility list
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (isPlatform) {
          const [data, freq] = await Promise.all([
            getDashboardOverview(),
            getSurveyFrequency(),
          ]);
          setOverview(data);
          setSurveyFreq(freq);
        } else {
          const facilityList = await getDashboardFacilities();
          setFacilities(facilityList);
          if (facilityList.length > 0) {
            setSelectedFacility(facilityList[0].facility_name);
          }
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [isPlatform]);

  // Load dashboard data whenever selected facility changes
  useEffect(() => {
    if (isPlatform || !selectedFacility) return;
    async function loadFacility() {
      try {
        setFacilityLoading(true);
        const data = await getFacilityDashboard(selectedFacility);
        setFacilityData(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setFacilityLoading(false);
      }
    }
    void loadFacility();
  }, [isPlatform, selectedFacility]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading dashboard...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  // Platform admin: cross-facility overview
  if (isPlatform && overview) {
    return (
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h2 className="text-[26px] font-bold text-foreground tracking-tight">
            Platform Insights
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Platform-wide analytics, adoption trends, and compliance overview
          </p>
        </div>

        {/* Row 1: KPI Cards */}
        <AdminKpiCards
          totalFacilities={overview.total_facilities}
          totalSurveys={overview.total_cases}
          surveysCompleted={overview.surveys_completed}
          deficiencies={overview.deficiencies}
        />

        {/* Row 2: Survey Activity Trend (full width) — NEW */}
        <SurveyActivityTrendChart data={overview.activity_trend} />

        {/* Row 3: Customer Leaderboard + Survey Completion Funnel — NEW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomerLeaderboardCard data={overview.facility_leaderboard} />
          <SurveyCompletionFunnel data={overview.funnel_data} />
        </div>

        {/* Row 4: Pathway Popularity + Activity Calendar — NEW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PathwayPopularityTreemap data={overview.pathway_popularity} />
          <ActivityCalendarHeatmap data={overview.daily_activity} />
        </div>

        {/* Row 5: Facility Table (full width) */}
        <FacilityTable
          rankings={overview.facility_rankings}
          areaScores={overview.compliance_area_scores}
        />

        {/* Row 6: Survey Frequency + Citations by F-Tag */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SurveyFrequencyChart data={surveyFreq} />
          <CitationsByTagChart data={overview.ftag_citations} />
        </div>

        {/* Row 7: Tabbed detail panels (pills) */}
        <div className="bg-white rounded-lg border border-gray-200">
          <Tabs defaultValue="status">
            <div className="px-5 pt-4">
              <TabsList className="inline-flex h-auto items-center gap-1.5 border-0 bg-gray-100 rounded-lg p-1">
                <TabsTrigger
                  value="status"
                  className="rounded-md px-3.5 py-1.5 text-xs font-semibold text-gray-500 border-0 data-[state=active]:bg-white data-[state=active]:text-[#0077b6] data-[state=active]:shadow-sm data-[state=active]:border-0"
                >
                  Survey Status
                </TabsTrigger>
                <TabsTrigger
                  value="compliance"
                  className="rounded-md px-3.5 py-1.5 text-xs font-semibold text-gray-500 border-0 data-[state=active]:bg-white data-[state=active]:text-[#0077b6] data-[state=active]:shadow-sm data-[state=active]:border-0"
                >
                  Compliance Analysis
                </TabsTrigger>
                <TabsTrigger
                  value="pathways"
                  className="rounded-md px-3.5 py-1.5 text-xs font-semibold text-gray-500 border-0 data-[state=active]:bg-white data-[state=active]:text-[#0077b6] data-[state=active]:shadow-sm data-[state=active]:border-0"
                >
                  Pathway Coverage
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="status" className="px-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SurveyStatusChart
                  total={overview.total_cases}
                  completed={overview.completed_cases}
                  inProgress={overview.in_progress_cases}
                />
                <SeverityDistributionChart data={overview.ftag_citations} />
                <ActionItemsChart actionItems={overview.action_items} />
              </div>
            </TabsContent>

            <TabsContent value="compliance" className="px-5 pb-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ComplianceRadarChart scores={overview.compliance_area_scores} />
                <CitationsByFacilityChart data={overview.facility_rankings} />
              </div>
            </TabsContent>

            <TabsContent value="pathways" className="px-5 pb-5">
              <PathwayCoverageChart data={overview.pathway_coverage} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Customer mode: single facility dashboard
  if (!isPlatform && facilities.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-bold text-foreground tracking-tight">
              Compliance Dashboard
            </h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Facility compliance details
            </p>
          </div>

          {facilities.length > 1 && (
            <Select value={selectedFacility} onValueChange={setSelectedFacility}>
              <SelectTrigger className="w-[260px] h-9 text-sm">
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.facility_name} value={f.facility_name}>
                    {f.facility_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {facilityLoading ? (
          <p className="text-sm text-gray-500">Loading facility data...</p>
        ) : facilityData ? (
          <>
            {/* Row 1: KPI Cards */}
            <DashboardCards
              deficiencies={facilityData.deficiencies}
              actionItems={facilityData.action_items}
              surveysCompleted={facilityData.surveys_completed}
              totalCases={facilityData.total_cases}
              inProgress={facilityData.in_progress_cases}
              completed={facilityData.completed_cases}
            />

            {/* Row 2: Three donut charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SurveyStatusChart
                total={facilityData.total_cases}
                completed={facilityData.completed_cases}
                inProgress={facilityData.in_progress_cases}
              />
              <SeverityDistributionChart data={facilityData.ftag_citations} />
              <ActionItemsChart actionItems={facilityData.action_items} />
            </div>

            {/* Row 3: Radar + Citations by F-Tag */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ComplianceRadarChart scores={facilityData.compliance_area_scores} />
              <CitationsByTagChart data={facilityData.ftag_citations} />
            </div>

            {/* Row 4: Compliance Gauges */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <ComplianceGauges scores={facilityData.compliance_area_scores} />
            </div>

            {/* Row 5: Tabbed detail panels (pills) */}
            <div className="bg-white rounded-lg border border-gray-200">
              <Tabs defaultValue="scores">
                <div className="px-5 pt-4">
                  <TabsList className="inline-flex h-auto items-center gap-1.5 border-0 bg-gray-100 rounded-lg p-1">
                    <TabsTrigger
                      value="scores"
                      className="rounded-md px-3.5 py-1.5 text-xs font-semibold text-gray-500 border-0 data-[state=active]:bg-white data-[state=active]:text-[#0077b6] data-[state=active]:shadow-sm data-[state=active]:border-0"
                    >
                      Compliance Scores
                    </TabsTrigger>
                    <TabsTrigger
                      value="deficiencies"
                      className="rounded-md px-3.5 py-1.5 text-xs font-semibold text-gray-500 border-0 data-[state=active]:bg-white data-[state=active]:text-[#0077b6] data-[state=active]:shadow-sm data-[state=active]:border-0"
                    >
                      Deficiency Details
                    </TabsTrigger>
                    <TabsTrigger
                      value="pathways"
                      className="rounded-md px-3.5 py-1.5 text-xs font-semibold text-gray-500 border-0 data-[state=active]:bg-white data-[state=active]:text-[#0077b6] data-[state=active]:shadow-sm data-[state=active]:border-0"
                    >
                      Pathway Coverage
                    </TabsTrigger>
                    <TabsTrigger
                      value="actions"
                      className="rounded-md px-3.5 py-1.5 text-xs font-semibold text-gray-500 border-0 data-[state=active]:bg-white data-[state=active]:text-[#0077b6] data-[state=active]:shadow-sm data-[state=active]:border-0"
                    >
                      Action Plans
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="scores" className="px-5 pb-5">
                  <ComplianceProgressBars scores={facilityData.compliance_area_scores} />
                </TabsContent>

                <TabsContent value="deficiencies" className="px-5 pb-5">
                  <DeficiencySummaryPanel
                    citations={facilityData.ftag_citations}
                    deficiencies={facilityData.deficiencies}
                  />
                </TabsContent>

                <TabsContent value="pathways" className="px-5 pb-5">
                  <PathwayCoverageChart data={facilityData.pathway_coverage} />
                </TabsContent>

                <TabsContent value="actions" className="px-5 pb-5">
                  <ActionPlanPanel plans={facilityData.action_plans} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">No data available.</p>
        )}
      </div>
    );
  }

  return <p className="text-sm text-gray-400">No data available.</p>;
}
