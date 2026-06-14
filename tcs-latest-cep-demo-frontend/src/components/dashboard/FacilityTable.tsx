import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FacilityCitationRank, ComplianceAreaScore } from "@/types";

interface FacilityTableProps {
  rankings: FacilityCitationRank[];
  areaScores: ComplianceAreaScore[];
}

function avgScore(scores: ComplianceAreaScore[]): number {
  if (scores.length === 0) return 100;
  return Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
}

function scoreBadge(score: number) {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-0";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-0";
  return "bg-red-50 text-red-700 border-0";
}

export function FacilityTable({ rankings, areaScores }: FacilityTableProps) {
  const navigate = useNavigate();
  const overallScore = avgScore(areaScores);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Facility Compliance Overview</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
              Facility
            </TableHead>
            <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-center">
              Surveys
            </TableHead>
            <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-center">
              Citations
            </TableHead>
            <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-center">
              Score
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-12 text-center text-sm text-gray-400">
                No facility data available.
              </TableCell>
            </TableRow>
          ) : (
            rankings.map((facility) => {
              // Per-facility score estimation: deduct from overall based on citation ratio
              const facilityScore = facility.citation_count === 0
                ? 100
                : Math.max(0, 100 - facility.citation_count * 12);
              return (
                <TableRow
                  key={facility.facility_name}
                  className="hover:bg-gray-50/50 cursor-pointer transition"
                  onClick={() => navigate(`/app/dashboard-overview/${encodeURIComponent(facility.facility_name)}`)}
                >
                  <TableCell className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-[13px] text-gray-900">
                        {facility.facility_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-5 text-sm text-gray-600 text-center">
                    {facility.case_count}
                  </TableCell>
                  <TableCell className="py-4 px-5 text-sm text-center">
                    <span className={facility.citation_count > 0 ? "text-red-600 font-medium" : "text-gray-500"}>
                      {facility.citation_count}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-5 text-center">
                    <Badge variant="secondary" className={`text-xs ${scoreBadge(facilityScore)}`}>
                      {facilityScore}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
