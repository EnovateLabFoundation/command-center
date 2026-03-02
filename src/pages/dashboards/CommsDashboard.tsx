import DashboardShell from './_DashboardShell';

export default function CommsDashboard() {
  return (
    <DashboardShell
      role="comms_director"
      label="COMMS DIRECTOR"
      subtitle="Communications Strategy & Execution"
      accentColor="text-terminal"
      modules={[
        { name: 'Narrative Platform', desc: 'Master narrative, voice, tone, and values', icon: '🎯' },
        { name: 'Audience Matrix', desc: 'Segmented messaging and proof points', icon: '👥' },
        { name: 'Comms Initiatives', desc: 'Campaign pipeline and channel planning', icon: '📢' },
        { name: 'Content Calendar', desc: 'Draft, approve, schedule, publish', icon: '🗓️' },
        { name: 'Crisis Comms', desc: 'Holding statements and response playbooks', icon: '🚨' },
        { name: 'Intel Feed', desc: 'Media monitoring and narrative threats', icon: '📡' },
      ]}
    />
  );
}
