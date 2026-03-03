/**
 * PortalAccessPage
 *
 * Manage client principal portal access — grant, revoke, and audit
 * client_principal access grants per engagement. Only accessible to super_admin.
 *
 * Features:
 *   - LBDDataTable of all access records
 *   - Multi-step "Grant Portal Access" wizard modal
 *   - Immediate revocation with LBDConfirmDialog
 *   - Edit allowed modules and expiry
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Key, UserPlus, ShieldOff, Edit, Check,
} from 'lucide-react';
import {
  LBDPageHeader, LBDDataTable, LBDModal, LBDModalButton,
  LBDConfirmDialog, LBDBadge, LBDCard,
} from '@/components/ui/lbd';
import type { ColumnDef } from '@/components/ui/lbd';
import { useAuthStore } from '@/stores/authStore';
import {
  usePortalAccessRecords, useGrantPortalAccess,
  useRevokePortalAccess,
  type PortalAccessRow,
} from '@/hooks/usePortalAccess';
import {
  useCreateUser,
} from '@/hooks/useUserManagement';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ─────────────────────────────────────────────
   Portal module options
───────────────────────────────────────────── */

const PORTAL_MODULES = [
  { key: 'engagement_overview', label: 'Engagement Overview' },
  { key: 'sentiment_dashboard', label: 'Sentiment Dashboard' },
  { key: 'media_coverage', label: 'Media Coverage Summary' },
  { key: 'social_performance', label: 'Social Media Performance' },
  { key: 'brand_scorecard', label: 'Brand Scorecard' },
  { key: 'campaign_progress', label: 'Campaign Progress' },
  { key: 'geographic_performance', label: 'Geographic Performance' },
  { key: 'monthly_reports', label: 'Monthly Reports' },
  { key: 'intel_briefing', label: 'Intelligence Briefing (Summary)' },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function PortalAccessPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { data: records = [], isLoading } = usePortalAccessRecords();
  const grantAccess = useGrantPortalAccess();
  const revokeAccess = useRevokePortalAccess();
  const createUser = useCreateUser();

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState<PortalAccessRow | null>(null);

  // Step 1 — Select engagement
  const [selectedEngagement, setSelectedEngagement] = useState('');

  // Step 2 — User
  const [userMode, setUserMode] = useState<'existing' | 'new'>('existing');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  // Step 3 — Modules
  const [selectedModules, setSelectedModules] = useState<string[]>(
    PORTAL_MODULES.map((m) => m.key)
  );

  // Step 4 — Expiry
  const [neverExpire, setNeverExpire] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  // Fetch engagements for step 1
  const { data: engagements = [] } = useQuery({
    queryKey: ['admin', 'engagements-for-portal'],
    queryFn: async () => {
      const { data } = await supabase
        .from('engagements')
        .select('id, title, client_id, status')
        .in('status', ['active', 'paused', 'closed'])
        .order('title');

      if (!data?.length) return [];

      const clientIds = [...new Set(data.map((e) => e.client_id))];
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      const clientMap = new Map((clients ?? []).map((c) => [c.id, c.name]));

      return data.map((e) => ({
        id: e.id,
        title: e.title,
        client_name: clientMap.get(e.client_id) ?? '—',
        status: e.status,
      }));
    },
  });

  // Fetch existing client_principal users for step 2
  const { data: portalUsers = [] } = useQuery({
    queryKey: ['admin', 'portal-users'],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'client_principal');

      if (!roles?.length) return [];

      const ids = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);

      return profiles ?? [];
    },
  });

  const resetWizard = () => {
    setWizardStep(1);
    setSelectedEngagement('');
    setUserMode('existing');
    setSelectedUserId('');
    setNewUserName('');
    setNewUserEmail('');
    setSelectedModules(PORTAL_MODULES.map((m) => m.key));
    setNeverExpire(false);
    setExpiryDate('');
  };

  const toggleModule = (key: string) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const handleGrant = async () => {
    let userId = selectedUserId;

    // Create new user if needed
    if (userMode === 'new') {
      const result = await createUser.mutateAsync({
        email: newUserEmail,
        full_name: newUserName,
        role: 'client_principal',
      });
      userId = result.user_id;
    }

    await grantAccess.mutateAsync({
      user_id: userId,
      engagement_id: selectedEngagement,
      allowed_modules: selectedModules,
      expires_at: neverExpire ? null : expiryDate ? new Date(expiryDate).toISOString() : null,
      created_by: currentUser?.id ?? '',
    });

    setWizardOpen(false);
    resetWizard();
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    await revokeAccess.mutateAsync({
      id: revokeTarget.id,
      revoked_by: currentUser?.id ?? '',
    });
    setRevokeTarget(null);
  };

  /* ── Table columns ── */
  const columns = useMemo<ColumnDef<PortalAccessRow>[]>(() => [
    { key: 'client_name', label: 'Client', sortable: true },
    { key: 'engagement_title', label: 'Engagement', sortable: true },
    { key: 'user_email', label: 'Portal User', sortable: true },
    {
      key: 'allowed_modules',
      label: 'Modules',
      render: (v) => {
        const mods = v as string[];
        return (
          <span className="text-xs text-muted-foreground">
            {mods.length} module{mods.length !== 1 ? 's' : ''}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (v) => <LBDBadge variant="status" value={v ? 'active' : 'inactive'} size="sm" />,
    },
    {
      key: 'expires_at',
      label: 'Expires',
      sortable: true,
      render: (v) => v ? format(new Date(v as string), 'dd MMM yyyy') : 'Never',
    },
    { key: 'created_by_name', label: 'Granted By' },
    {
      key: 'id',
      label: 'Actions',
      align: 'right' as const,
      noExport: true,
      render: (_v, row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); setRevokeTarget(row); }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Revoke access"
            disabled={!row.is_active}
          >
            <ShieldOff className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], []);

  /* ── Wizard step labels ── */
  const stepLabels = ['Select Engagement', 'Portal User', 'Configure Modules', 'Set Expiry', 'Review & Confirm'];

  const selectedEng = engagements.find((e) => e.id === selectedEngagement);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <LBDPageHeader
        eyebrow="PLATFORM · ADMIN"
        title="Portal Access"
        description="Grant and revoke client principal access to the client portal per engagement."
        actions={
          <button
            onClick={() => { resetWizard(); setWizardOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Grant Portal Access
          </button>
        }
      />

      <LBDDataTable
        columns={columns}
        data={records}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        enableExport
        exportFilename="portal-access-export"
        searchPlaceholder="Search access records…"
        emptyIcon={<Key className="w-8 h-8" />}
        emptyTitle="No portal access records"
        emptyDescription="Grant portal access to client principals to get started."
      />

      {/* ── Grant Access Wizard ── */}
      <LBDModal
        open={wizardOpen}
        onClose={() => { setWizardOpen(false); resetWizard(); }}
        title={`Grant Portal Access — Step ${wizardStep}`}
        description={stepLabels[wizardStep - 1]}
        size="lg"
        footer={
          <>
            {wizardStep > 1 && (
              <LBDModalButton variant="ghost" onClick={() => setWizardStep((s) => s - 1)}>Back</LBDModalButton>
            )}
            <LBDModalButton variant="ghost" onClick={() => { setWizardOpen(false); resetWizard(); }}>Cancel</LBDModalButton>
            {wizardStep < 5 ? (
              <LBDModalButton
                variant="primary"
                onClick={() => setWizardStep((s) => s + 1)}
                disabled={
                  (wizardStep === 1 && !selectedEngagement) ||
                  (wizardStep === 2 && userMode === 'existing' && !selectedUserId) ||
                  (wizardStep === 2 && userMode === 'new' && (!newUserEmail || !newUserName)) ||
                  (wizardStep === 3 && selectedModules.length === 0)
                }
              >
                Next
              </LBDModalButton>
            ) : (
              <LBDModalButton
                variant="primary"
                onClick={handleGrant}
                disabled={grantAccess.isPending || createUser.isPending}
              >
                {grantAccess.isPending || createUser.isPending ? 'Granting…' : 'Grant Access'}
              </LBDModalButton>
            )}
          </>
        }
      >
        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-6">
          {stepLabels.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i + 1 <= wizardStep ? 'bg-accent' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* Step 1 — Select Engagement */}
        {wizardStep === 1 && (
          <div className="space-y-3">
            <label className="block text-xs text-muted-foreground mb-1.5">Select Client & Engagement</label>
            <select
              value={selectedEngagement}
              onChange={(e) => setSelectedEngagement(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Select engagement —</option>
              {engagements.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.client_name} — {e.title} ({e.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 2 — Portal User */}
        {wizardStep === 2 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <button
                onClick={() => setUserMode('existing')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  userMode === 'existing'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Link Existing User
              </button>
              <button
                onClick={() => setUserMode('new')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  userMode === 'new'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Create New User
              </button>
            </div>

            {userMode === 'existing' ? (
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Select Portal User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Select user —</option>
                  {portalUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Full Name</label>
                  <input
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Client contact name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Email</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="client@example.com"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  A new client_principal account will be created and an invite email sent.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Configure Modules */}
        {wizardStep === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Select which portal modules this client can access:</p>
            <div className="grid grid-cols-1 gap-2">
              {PORTAL_MODULES.map((mod) => (
                <label
                  key={mod.key}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedModules.includes(mod.key)
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(mod.key)}
                    onChange={() => toggleModule(mod.key)}
                    className="rounded border-border accent-accent"
                  />
                  <span className="text-sm text-foreground">{mod.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Set Expiry */}
        {wizardStep === 4 && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={neverExpire}
                onChange={(e) => setNeverExpire(e.target.checked)}
                className="rounded border-border accent-accent"
              />
              Never expire (requires Lead Advisor sign-off)
            </label>
            {!neverExpire && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 5 — Review & Confirm */}
        {wizardStep === 5 && (
          <div className="space-y-4">
            <LBDCard className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Engagement</span>
                <span className="text-foreground font-medium">
                  {selectedEng ? `${selectedEng.client_name} — ${selectedEng.title}` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Portal User</span>
                <span className="text-foreground font-medium">
                  {userMode === 'existing'
                    ? portalUsers.find((u) => u.id === selectedUserId)?.email ?? '—'
                    : `${newUserName} (${newUserEmail}) — NEW`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Modules</span>
                <span className="text-foreground">{selectedModules.length} enabled</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expires</span>
                <span className="text-foreground">
                  {neverExpire ? 'Never' : expiryDate ? format(new Date(expiryDate), 'dd MMM yyyy') : 'Not set'}
                </span>
              </div>
            </LBDCard>
            <div className="text-xs text-muted-foreground">
              <p>On confirmation:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {userMode === 'new' && <li>A new client_principal account will be created</li>}
                <li>Portal access record will be created</li>
                {userMode === 'new' && <li>An invite email will be sent to {newUserEmail}</li>}
              </ul>
            </div>
          </div>
        )}
      </LBDModal>

      {/* ── Revoke Confirm ── */}
      <LBDConfirmDialog
        open={!!revokeTarget}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke Portal Access"
        description={`This will immediately revoke portal access for ${revokeTarget?.user_email} on engagement "${revokeTarget?.engagement_title}". Their next request will return 403.`}
        confirmLabel="Revoke Access"
        variant="danger"
        loading={revokeAccess.isPending}
      />
    </div>
  );
}
