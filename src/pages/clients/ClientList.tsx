/**
 * ClientList
 *
 * Central client registry. Shows all onboarded clients with their
 * qualification status, NDA state, conflict check result, and
 * active engagement count.
 *
 * "New Client" button launches the 4-step qualification wizard.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { UserPlus, Building2, CheckCircle2, XCircle, Clock, Briefcase } from 'lucide-react';
import {
  LBDPageHeader,
  LBDCard,
  LBDBadge,
  LBDDataTable,
  LBDEmptyState,
  type ColumnDef,
} from '@/components/ui/lbd';
import {
  useClientList,
  CLIENT_TYPE_LABELS,
  type ClientRow,
} from '@/hooks/useClients';
import NewEngagementModal from '@/pages/engagements/NewEngagementModal';

/* ─────────────────────────────────────────────
   Type display badge
───────────────────────────────────────────── */

const TYPE_STYLE: Record<string, string> = {
  legislator: 'bg-blue-950/50 text-blue-400 border-blue-800/40',
  governor:   'bg-purple-950/50 text-purple-400 border-purple-800/40',
  ministry:   'bg-indigo-950/50 text-indigo-400 border-indigo-800/40',
  civic:      'bg-teal-950/50 text-teal-400 border-teal-800/40',
  party:      'bg-amber-950/50 text-amber-400 border-amber-800/40',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono border tracking-wide ${TYPE_STYLE[type] ?? 'bg-muted/30 text-muted-foreground border-border'}`}>
      {CLIENT_TYPE_LABELS[type as keyof typeof CLIENT_TYPE_LABELS] ?? type}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Qualification status badge
───────────────────────────────────────────── */

function QualBadge({ status }: { status: string | null }) {
  if (!status || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400">
        <Clock className="w-3 h-3" /> PENDING
      </span>
    );
  }
  if (status === 'qualified') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
        <CheckCircle2 className="w-3 h-3" /> QUALIFIED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-400">
      <XCircle className="w-3 h-3" /> {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Column definitions
   (actions column receives onCreateEngagement
   via closure — built inside the component)
───────────────────────────────────────────── */

function buildColumns(onCreateEngagement: (clientId: string) => void): ColumnDef<ClientRow>[] {
  return [
  {
    key: 'name',
    label: 'Client',
    sortable: true,
    render: (_v, row) => (
      <div className="flex items-center gap-2.5">
        <div className="flex-none w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Building2 className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {row.name}
          </p>
          {row.contact_name && (
            <p className="text-[10px] text-muted-foreground truncate">
              {row.contact_name}
            </p>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'type',
    label: 'Type',
    sortable: true,
    render: (_v, row) => <TypeBadge type={row.type} />,
  },
  {
    key: 'nda_signed',
    label: 'NDA',
    sortable: true,
    render: (_v, row) => row.nda_signed
      ? <LBDBadge variant="rag" value="green" size="sm" />
      : <LBDBadge variant="rag" value="amber" size="sm" />,
  },
  {
    key: 'conflict_check_passed',
    label: 'Conflict',
    sortable: true,
    render: (_v, row) => row.conflict_check_passed
      ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
          <CheckCircle2 className="w-3 h-3" /> CLEAR
        </span>
      )
      : (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-400">
          <XCircle className="w-3 h-3" /> FLAGGED
        </span>
      ),
  },
  {
    key: 'qualification_status',
    label: 'Qualification',
    sortable: true,
    render: (_v, row) => <QualBadge status={row.qualification_status} />,
  },
  {
    key: 'active_engagements',
    label: 'Active Eng.',
    sortable: true,
    render: (_v, row) => (
      <span className="font-mono text-xs text-foreground">
        {row.active_engagements}
        {row.total_engagements > 0 && (
          <span className="text-muted-foreground ml-1">/ {row.total_engagements}</span>
        )}
      </span>
    ),
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true,
    render: (_v, row) => {
      try {
        return (
          <span className="text-xs font-mono text-muted-foreground">
            {format(parseISO(row.created_at), 'd MMM yyyy')}
          </span>
        );
      } catch {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
    },
  },
  {
    key: 'id',
    label: 'Actions',
    sortable: false,
    render: (_v, row) => {
      if (row.qualification_status !== 'qualified') return null;
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCreateEngagement(row.id);
          }}
          title="Create engagement for this client"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
        >
          <Briefcase className="w-3 h-3" aria-hidden="true" />
          Engage
        </button>
      );
    },
  },
];
}


/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function ClientList() {
  const navigate = useNavigate();
  const { data: clients, isLoading } = useClientList();

  const [engageClientId, setEngageClientId] = useState<string | null>(null);

  const qualifiedCount   = clients?.filter(c => c.qualification_status === 'qualified').length ?? 0;
  const pendingCount     = clients?.filter(c => !c.qualification_status || c.qualification_status === 'pending').length ?? 0;
  const flaggedCount     = clients?.filter(c => !c.conflict_check_passed).length ?? 0;

  const columns = buildColumns((clientId) => setEngageClientId(clientId));

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <LBDPageHeader
        eyebrow="CLIENT REGISTRY"
        title="Clients"
        subtitle="Manage client onboarding, qualification status, and engagement assignments."
        actions={
          <button
            onClick={() => navigate('/clients/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            New Client
          </button>
        }
      />

      {/* Summary strip */}
      {!isLoading && clients && clients.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Qualified',  value: qualifiedCount, cls: 'text-emerald-400' },
            { label: 'Pending',    value: pendingCount,   cls: 'text-amber-400' },
            { label: 'Conflict Flagged', value: flaggedCount, cls: flaggedCount > 0 ? 'text-red-400' : 'text-muted-foreground' },
          ].map(s => (
            <LBDCard key={s.label} className="p-4">
              <p className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground/50 uppercase mb-1">{s.label}</p>
              <p className={`text-2xl font-mono font-semibold ${s.cls}`}>{s.value}</p>
            </LBDCard>
          ))}
        </div>
      )}

      {/* Client table */}
      {!isLoading && clients?.length === 0 ? (
        <LBDEmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="No Clients Yet"
          description="Begin the client qualification process to onboard your first client."
          action={{
            label: 'Qualify First Client',
            onClick: () => navigate('/clients/new'),
          }}
        />
      ) : (
        <LBDCard padding="none">
          <LBDDataTable<ClientRow>
            columns={columns}
            data={clients ?? []}
            isLoading={isLoading}
            enableSearch
            searchPlaceholder="Search clients by name or contact…"
            enableExport
            exportFilename="clients"
            onRowClick={(row) => navigate(`/clients/${row.id}`)}
            emptyTitle="No clients match your search."
          />
        </LBDCard>
      )}

      {/* Create Engagement modal — pre-filled with the selected qualified client */}
      <NewEngagementModal
        open={engageClientId !== null}
        onClose={() => setEngageClientId(null)}
        prefilledClientId={engageClientId ?? undefined}
        onCreated={(engagementId) => {
          setEngageClientId(null);
          navigate(`/engagements/${engagementId}`);
        }}
      />
    </div>
  );
}
