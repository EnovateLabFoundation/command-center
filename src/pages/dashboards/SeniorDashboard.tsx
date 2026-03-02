import DashboardShell from './_DashboardShell';

export default function SeniorDashboard() {
  return (
    <DashboardShell
      role="senior_advisor"
      label="SENIOR ADVISOR"
      subtitle="Strategic Intelligence & Analysis"
      accentColor="text-intel"
      modules={[
        { name: 'Engagements', desc: 'Active engagements overview', icon: '📊' },
        { name: 'Stakeholder Map', desc: 'Influence, alignment, and risk profiles', icon: '🕸️' },
        { name: 'Intel Feed', desc: 'Media intelligence and sentiment tracking', icon: '📡' },
        { name: 'Scenarios', desc: 'Scenario probability and impact modelling', icon: '🔭' },
        { name: 'Narrative Platform', desc: 'Master narrative and audience matrix', icon: '📝' },
        { name: 'Touchpoints', desc: 'Upcoming advisory sessions', icon: '📅' },
      ]}
    />
  );
}
