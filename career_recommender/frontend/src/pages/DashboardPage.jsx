import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import { DashboardSkeleton } from "../components/skeletons/PageSkeleton";
import ScrollToTopButton from "../components/ScrollToTopButton";
import CareerOverview from "../components/dashboard/CareerOverview";
import CareerStatistics from "../components/dashboard/CareerStatistics";
import AiCareerInsights from "../components/dashboard/AiCareerInsights";
import SkillDnaSection, { SkillModal } from "../components/dashboard/SkillDna";
import SkillFamilies from "../components/dashboard/SkillFamilies";
import QuickWinsPanel from "../components/dashboard/QuickWins";
import MarketDemand from "../components/dashboard/MarketDemand";
import WeeklyLearningGoal from "../components/dashboard/WeeklyLearningGoal";
import LearningRecommendations from "../components/dashboard/LearningRecommendations";
import SmartRecommendations from "../components/dashboard/SmartRecommendations";
import RecentActivity from "../components/dashboard/RecentActivity";
import AchievementBadges from "../components/dashboard/AchievementBadges";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import ExportOptions from "../components/dashboard/ExportOptions";
import Charts from "../components/dashboard/Charts";
import { EmptyState } from "../components/dashboard/shared";
import { buildDashboardModel, DEFAULT_FILTERS } from "../components/dashboard/model";

export default function DashboardPage({ view = "dashboard" }) {
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");
  const [selectedDnaId, setSelectedDnaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [expandedFamilies, setExpandedFamilies] = useState({});
  const [skillDetail, setSkillDetail] = useState(null);

  useEffect(() => {
    const loadDashboardAndProfile = async () => {
      setLoading(true);
      try {
        const [dashboardRes, profileRes] = await Promise.allSettled([
          client.get("/dashboard/skills"),
          client.get("/profile/view"),
        ]);

        if (dashboardRes.status === "fulfilled") {
          setDashboard(dashboardRes.value.data);
        } else {
          setMessage(dashboardRes.reason?.response?.data?.detail || "Unable to load dashboard.");
        }

        if (profileRes.status === "fulfilled" && profileRes.value.data) {
          const profile = profileRes.value.data;
          const capitalize = (str) => {
            if (!str) return "";
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
          };
          setFilters((prev) => ({
            ...prev,
            targetRole: profile.desired_role || "All roles",
            experienceLevel: capitalize(profile.experience_level) || "All levels",
            industry: profile.domain || "All industries",
            location: capitalize(profile.location) || "All locations",
          }));
        }
      } catch (error) {
        setMessage("An error occurred while loading dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboardAndProfile();
  }, []);

  const model = useMemo(() => buildDashboardModel(dashboard, filters), [dashboard, filters]);

  useEffect(() => {
    const nextProfiles = model.skillDnaProfiles || [];
    if (!nextProfiles.length) {
      if (selectedDnaId) setSelectedDnaId("");
      return;
    }
    if (!nextProfiles.some((profile) => profile.id === selectedDnaId)) {
      setSelectedDnaId(nextProfiles[0].id);
    }
  }, [model.skillDnaProfiles, selectedDnaId]);

  useEffect(() => {
    if (model.familyGaps[0]?.family && Object.keys(expandedFamilies).length === 0) {
      setExpandedFamilies({ [model.familyGaps[0].family]: true });
    }
  }, [model.familyGaps, expandedFamilies]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const toggleFamily = (family) => {
    setExpandedFamilies((current) => ({ ...current, [family]: !current[family] }));
  };

  if (view === "skill-gap") {
    return (
      <div className="dashboard-page">
        {message && <div className="dashboard-message">{message}</div>}
        <div className="dashboard-top-actions">
          <DashboardFilters filters={filters} onChange={setFilters} model={model} />
          <ExportOptions model={model} />
        </div>
        {dashboard ? (
          <div className="dashboard-main-grid">
            <div className="dashboard-main-column">
              <SkillDnaSection profiles={model.skillDnaProfiles} selectedId={selectedDnaId} onSelect={setSelectedDnaId} onOpenSkill={setSkillDetail} />
              <SkillFamilies families={model.familyGaps} expandedFamilies={expandedFamilies} onToggleFamily={toggleFamily} onOpenSkill={setSkillDetail} />
              <Charts model={model} />
            </div>
            <aside className="dashboard-side-column">
              <QuickWinsPanel quickWins={model.quickWins} onOpenSkill={setSkillDetail} />
              <LearningRecommendations model={model} />
              <MarketDemand model={model} />
            </aside>
          </div>
        ) : (
          <EmptyState title="Skill gap data unavailable" message="The dashboard could not load the current skill analysis. Try refreshing after the backend is running." />
        )}
        <SkillModal detail={skillDetail} onClose={() => setSkillDetail(null)} />
        <ScrollToTopButton />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {message && <div className="dashboard-message">{message}</div>}
      <div className="dashboard-top-actions">
        <DashboardFilters filters={filters} onChange={setFilters} model={model} />
        <ExportOptions model={model} />
      </div>
      <CareerOverview model={model} />
      {dashboard ? (
        <>
          <CareerStatistics model={model} />
          <div className="dashboard-main-grid">
            <div className="dashboard-main-column">
              <AiCareerInsights model={model} />
              <SkillDnaSection profiles={model.skillDnaProfiles} selectedId={selectedDnaId} onSelect={setSelectedDnaId} onOpenSkill={setSkillDetail} />
              <SkillFamilies families={model.familyGaps} expandedFamilies={expandedFamilies} onToggleFamily={toggleFamily} onOpenSkill={setSkillDetail} />
              <Charts model={model} />
              <MarketDemand model={model} />
            </div>
            <aside className="dashboard-side-column">
              <WeeklyLearningGoal model={model} />
              <QuickWinsPanel quickWins={model.quickWins} onOpenSkill={setSkillDetail} />
              <LearningRecommendations model={model} />
              <SmartRecommendations model={model} />
              <RecentActivity model={model} />
              <AchievementBadges model={model} />
            </aside>
          </div>
        </>
      ) : (
        <EmptyState title="Dashboard data unavailable" message="The dashboard could not load the current skill analysis. Try refreshing after the backend is running." />
      )}
      <SkillModal detail={skillDetail} onClose={() => setSkillDetail(null)} />
      <ScrollToTopButton />
    </div>
  );
}
