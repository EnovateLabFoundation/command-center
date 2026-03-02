import DashboardShell from './_DashboardShell';

export default function DigitalDashboard() {
  return (
    <DashboardShell
      role="digital_strategist"
      label="DIGITAL STRATEGIST"
      subtitle="Digital Content & Campaign Execution"
      accentColor="text-terminal"
      modules={[
        { name: 'Content Studio', desc: 'Draft, edit, and schedule digital content', icon: '✍️' },
        { name: 'Comms Initiatives', desc: 'Campaign pipeline and deliverables', icon: '📢' },
        { name: 'Narrative Reference', desc: 'Brand voice, tone, and messaging guide', icon: '📖' },
        { name: 'Intel Snapshot', desc: 'Curated intelligence summary for content', icon: '📡' },
        { name: 'Approval Queue', desc: 'Content items awaiting sign-off', icon: '✅' },
        { name: 'Engagement Metrics', desc: 'Published content performance tracking', icon: '📊' },
      ]}
    />
  );
}
