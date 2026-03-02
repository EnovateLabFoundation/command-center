import DashboardShell from './_DashboardShell';

export default function IntelDashboard() {
  return (
    <DashboardShell
      role="intel_analyst"
      label="INTEL ANALYST"
      subtitle="Political Intelligence Operations"
      accentColor="text-intel"
      modules={[
        { name: 'Intel Feed', desc: 'Log and classify media intelligence items', icon: '📡' },
        { name: 'Stakeholder Map', desc: 'Influence scoring and alignment tracking', icon: '🕸️' },
        { name: 'Competitor Profiles', desc: 'Threat analysis and social benchmarking', icon: '🔍' },
        { name: 'Scenarios (Read)', desc: 'View strategic scenario assessments', icon: '🔭' },
        { name: 'Sentiment Tracker', desc: 'Trend analysis across media channels', icon: '📊' },
        { name: 'Urgent Flags', desc: 'Escalated items requiring immediate attention', icon: '🚩' },
      ]}
    />
  );
}
