import { getAnalyticsSummary } from "@/actions/analytics";
import { UtilizationChartLazy } from "@/components/dashboard/analytics/utilization-chart-lazy";
import { PopularBoatsRanking } from "@/components/dashboard/analytics/popular-boats-ranking";
import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";

export async function DashboardUtilizationSection({ marinaId }: { marinaId: string }) {
  const analytics = await getAnalyticsSummary(marinaId);

  return (
    <div className="dash-chart-grid">
      <DashCard hover={false}>
        <DashCardHeader>
          <DashCardTitle className="dash-card-title-lg">
            Boat Utilization (This Month)
          </DashCardTitle>
        </DashCardHeader>
        <DashCardContent className="dash-card-content--chart !pt-3">
          <UtilizationChartLazy data={analytics.utilization} />
        </DashCardContent>
      </DashCard>
      <DashCard hover={false}>
        <DashCardHeader>
          <DashCardTitle className="dash-card-title-lg">
            Popular Boats (90 days)
          </DashCardTitle>
        </DashCardHeader>
        <DashCardContent className="!pt-3">
          <PopularBoatsRanking boats={analytics.popularBoats} />
        </DashCardContent>
      </DashCard>
    </div>
  );
}
