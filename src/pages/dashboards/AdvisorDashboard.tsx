import DashboardShell from './_DashboardShell';

export default function AdvisorDashboard() {
  return (
    <DashboardShell
      role="lead_advisor"
      label="LEAD ADVISOR"
      subtitle="Engagement Command Centre"
      accentColor="text-accent"
      modules={[
        { name: 'My Engagements', desc: 'Active client engagements you lead', icon: '📁' },
        { name: 'Client Profiles', desc: 'Client onboarding and NDA status', icon: '🤝' },
        { name: 'Strategic Scenarios', desc: 'Scenario planning and horizon mapping', icon: '🗺️' },
        { name: 'Cadence Touchpoints', desc: 'Scheduled advisory check-ins', icon: '📅' },
        { name: 'Brand Audits', desc: 'Brand health scores and roadmaps', icon: '📈' },
        { name: 'Crisis Management', desc: 'Crisis type playbooks and live events', icon: '🚨' },
      ]}
    />
  );
}
