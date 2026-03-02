import DashboardShell from './_DashboardShell';

export default function PortalDashboard() {
  return (
    <DashboardShell
      role="client_principal"
      label="CLIENT PORTAL"
      subtitle="Your Engagement Intelligence View"
      accentColor="text-accent"
      modules={[
        { name: 'Engagement Overview', desc: 'Status, phase, and health of your engagement', icon: '📊' },
        { name: 'Strategic Updates', desc: 'Latest reports and advisory briefings', icon: '📋' },
        { name: 'Narrative Summary', desc: 'Approved messaging framework', icon: '🎯' },
        { name: 'Published Content', desc: 'Approved and scheduled content', icon: '📰' },
        { name: 'Upcoming Touchpoints', desc: 'Scheduled advisory sessions', icon: '📅' },
        { name: 'Documents', desc: 'Shared reports and deliverables', icon: '📁' },
      ]}
    />
  );
}
