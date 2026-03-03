/**
 * UserManagementPage
 *
 * Full user account management for super_admin:
 *   - LBDDataTable of all users with avatar, role badge, status, MFA, last login
 *   - Create User modal with role assignment
 *   - Edit User drawer (change role, view details)
 *   - Deactivate / Activate user via LBDConfirmDialog
 *   - Reset MFA via LBDConfirmDialog
 *   - Role Permissions Matrix (read-only reference)
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Users, UserPlus, ShieldCheck, ShieldOff, KeyRound,
  Edit, MoreHorizontal, Check, X,
} from 'lucide-react';
import {
  LBDPageHeader, LBDDataTable, LBDModal, LBDModalButton,
  LBDDrawer, LBDDrawerSection, LBDDrawerField,
  LBDConfirmDialog, LBDBadge, LBDCard,
} from '@/components/ui/lbd';
import type { ColumnDef } from '@/components/ui/lbd';
import { useAuthStore, type AppRole } from '@/stores/authStore';
import {
  useUsers, useCreateUser, useDeactivateUser, useActivateUser,
  useChangeRole, useResetMFA,
  type UserRow,
} from '@/hooks/useUserManagement';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

const ALL_ROLES: AppRole[] = [
  'super_admin', 'lead_advisor', 'senior_advisor',
  'comms_director', 'intel_analyst', 'digital_strategist', 'client_principal',
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  lead_advisor: 'Lead Advisor',
  senior_advisor: 'Senior Advisor',
  comms_director: 'Comms Director',
  intel_analyst: 'Intel Analyst',
  digital_strategist: 'Digital Strategist',
  client_principal: 'Client Principal',
};

/** Read-only permissions matrix for reference */
const PERMISSIONS_MATRIX = [
  { capability: 'Platform Admin', super_admin: true, lead_advisor: false, senior_advisor: false, comms_director: false, intel_analyst: false, digital_strategist: false, client_principal: false },
  { capability: 'Manage Users', super_admin: true, lead_advisor: false, senior_advisor: false, comms_director: false, intel_analyst: false, digital_strategist: false, client_principal: false },
  { capability: 'Create Engagements', super_admin: true, lead_advisor: true, senior_advisor: false, comms_director: false, intel_analyst: false, digital_strategist: false, client_principal: false },
  { capability: 'View All Engagements', super_admin: true, lead_advisor: true, senior_advisor: true, comms_director: true, intel_analyst: true, digital_strategist: true, client_principal: false },
  { capability: 'Manage Intel Items', super_admin: true, lead_advisor: false, senior_advisor: false, comms_director: false, intel_analyst: true, digital_strategist: false, client_principal: false },
  { capability: 'Manage Stakeholders', super_admin: true, lead_advisor: true, senior_advisor: false, comms_director: false, intel_analyst: true, digital_strategist: false, client_principal: false },
  { capability: 'Manage Narrative', super_admin: true, lead_advisor: true, senior_advisor: false, comms_director: true, intel_analyst: false, digital_strategist: false, client_principal: false },
  { capability: 'Manage Content', super_admin: true, lead_advisor: false, senior_advisor: false, comms_director: true, intel_analyst: false, digital_strategist: true, client_principal: false },
  { capability: 'Manage Crisis Events', super_admin: true, lead_advisor: true, senior_advisor: false, comms_director: false, intel_analyst: false, digital_strategist: false, client_principal: false },
  { capability: 'View Client Portal', super_admin: false, lead_advisor: false, senior_advisor: false, comms_director: false, intel_analyst: false, digital_strategist: false, client_principal: true },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function UserManagementPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const deactivateUser = useDeactivateUser();
  const activateUser = useActivateUser();
  const changeRole = useChangeRole();
  const resetMFA = useResetMFA();

  // Modal / drawer state
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);
  const [mfaResetTarget, setMfaResetTarget] = useState<UserRow | null>(null);

  // Create form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<string>('intel_analyst');
  const [newPassword, setNewPassword] = useState('');
  const [sendInvite, setSendInvite] = useState(true);

  // Edit drawer role change
  const [editRole, setEditRole] = useState('');

  const resetCreateForm = () => {
    setNewEmail('');
    setNewName('');
    setNewRole('intel_analyst');
    setNewPassword('');
    setSendInvite(true);
  };

  const handleCreate = async () => {
    await createUser.mutateAsync({
      email: newEmail,
      full_name: newName,
      role: newRole,
      password: sendInvite ? undefined : newPassword,
    });
    setCreateOpen(false);
    resetCreateForm();
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    if (deactivateTarget.is_active) {
      await deactivateUser.mutateAsync(deactivateTarget.id);
    } else {
      await activateUser.mutateAsync(deactivateTarget.id);
    }
    setDeactivateTarget(null);
  };

  const handleRoleChange = async () => {
    if (!editUser || editRole === editUser.role) return;
    await changeRole.mutateAsync({
      user_id: editUser.id,
      new_role: editRole,
      old_role: editUser.role as string,
    });
    setEditUser(null);
  };

  const handleMfaReset = async () => {
    if (!mfaResetTarget) return;
    await resetMFA.mutateAsync(mfaResetTarget.id);
    setMfaResetTarget(null);
  };

  /* ── Table columns ── */
  const columns = useMemo<ColumnDef<UserRow>[]>(() => [
    {
      key: 'avatar_url',
      label: '',
      width: 48,
      noExport: true,
      render: (_v, row) => {
        const initials = row.full_name
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return (
          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
            <span className="font-mono text-[9px] font-bold text-accent">{initials}</span>
          </div>
        );
      },
    },
    { key: 'full_name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (v) => <LBDBadge variant="role" value={String(v)} size="sm" />,
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (v) => (
        <LBDBadge variant="status" value={v ? 'active' : 'inactive'} size="sm" />
      ),
    },
    {
      key: 'mfa_enabled',
      label: 'MFA',
      align: 'center' as const,
      render: (v) => v
        ? <ShieldCheck className="w-4 h-4 text-green-400 mx-auto" />
        : <ShieldOff className="w-4 h-4 text-muted-foreground/40 mx-auto" />,
    },
    {
      key: 'last_login',
      label: 'Last Login',
      sortable: true,
      render: (v) => v ? format(new Date(v as string), 'dd MMM yyyy HH:mm') : '—',
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (v) => format(new Date(v as string), 'dd MMM yyyy'),
    },
    {
      key: 'id',
      label: 'Actions',
      align: 'right' as const,
      noExport: true,
      render: (_v, row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); setEditUser(row); setEditRole(row.role as string); }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            title="Edit user"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeactivateTarget(row); }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            title={row.is_active ? 'Deactivate' : 'Activate'}
          >
            {row.is_active ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMfaResetTarget(row); }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            title="Reset MFA"
            disabled={!row.mfa_enabled}
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <LBDPageHeader
        eyebrow="PLATFORM · ADMIN"
        title="User Management"
        description="Create and manage user accounts, assign roles, and control platform access."
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
        }
      />

      {/* ── User Table ── */}
      <LBDDataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        enableExport
        exportFilename="users-export"
        searchPlaceholder="Search users…"
        emptyIcon={<Users className="w-8 h-8" />}
        emptyTitle="No users found"
        emptyDescription="Create a user to get started."
        onRowClick={(row) => { setEditUser(row); setEditRole(row.role as string); }}
      />

      {/* ── Role Permissions Matrix ── */}
      <div className="space-y-3">
        <h3 className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
          Role Permissions Matrix
        </h3>
        <LBDCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-card/80">
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] tracking-widest text-muted-foreground">Capability</th>
                  {ALL_ROLES.map((role) => (
                    <th key={role} className="px-2 py-2.5 text-center font-mono text-[9px] tracking-widest text-muted-foreground whitespace-nowrap">
                      {ROLE_LABELS[role]?.split(' ').map((w) => w[0]).join('')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS_MATRIX.map((row) => (
                  <tr key={row.capability} className="border-b border-border/30">
                    <td className="px-4 py-2 text-foreground/80 text-xs">{row.capability}</td>
                    {ALL_ROLES.map((role) => (
                      <td key={role} className="px-2 py-2 text-center">
                        {(row as unknown as Record<string, boolean>)[role]
                          ? <Check className="w-3.5 h-3.5 text-green-400 mx-auto" />
                          : <X className="w-3 h-3 text-muted-foreground/20 mx-auto" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LBDCard>
      </div>

      {/* ── Create User Modal ── */}
      <LBDModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); resetCreateForm(); }}
        title="Create New User"
        description="Add a new user account and assign their role."
        footer={
          <>
            <LBDModalButton variant="ghost" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Cancel</LBDModalButton>
            <LBDModalButton
              variant="primary"
              onClick={handleCreate}
              disabled={!newEmail || !newName || createUser.isPending}
            >
              {createUser.isPending ? 'Creating…' : 'Create User'}
            </LBDModalButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Full Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="rounded border-border accent-accent"
              />
              Send invite email
            </label>
          </div>
          {!sendInvite && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Temporary Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Min 8 characters"
              />
            </div>
          )}
        </div>
      </LBDModal>

      {/* ── Edit User Drawer ── */}
      <LBDDrawer
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit User"
        description={editUser?.email ?? ''}
        footer={
          <>
            <LBDModalButton variant="ghost" onClick={() => setEditUser(null)}>Close</LBDModalButton>
            <LBDModalButton
              variant="primary"
              onClick={handleRoleChange}
              disabled={!editUser || editRole === editUser.role || changeRole.isPending}
            >
              {changeRole.isPending ? 'Saving…' : 'Save Changes'}
            </LBDModalButton>
          </>
        }
      >
        {editUser && (
          <>
            <LBDDrawerSection label="User Details">
              <LBDDrawerField label="Full Name" value={editUser.full_name} />
              <LBDDrawerField label="Email" value={
                <span className="flex items-center gap-2">
                  {editUser.email}
                  <span className="text-[9px] text-muted-foreground/60 font-mono">(immutable)</span>
                </span>
              } />
              <LBDDrawerField label="Status" value={<LBDBadge variant="status" value={editUser.is_active ? 'active' : 'inactive'} />} />
              <LBDDrawerField label="MFA" value={editUser.mfa_enabled ? 'Enabled' : 'Not configured'} />
              <LBDDrawerField label="Last Login" value={editUser.last_login ? format(new Date(editUser.last_login as string), 'dd MMM yyyy HH:mm') : 'Never'} />
            </LBDDrawerSection>

            <LBDDrawerSection label="Role Assignment">
              <label className="block text-xs text-muted-foreground mb-1.5">Current Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              {editRole !== editUser.role && (
                <p className="mt-2 text-xs text-warning">
                  Role will change from {ROLE_LABELS[editUser.role as string]} → {ROLE_LABELS[editRole]}. This will be logged in the audit trail.
                </p>
              )}
            </LBDDrawerSection>
          </>
        )}
      </LBDDrawer>

      {/* ── Deactivate/Activate Confirm ── */}
      <LBDConfirmDialog
        open={!!deactivateTarget}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title={deactivateTarget?.is_active ? 'Deactivate User' : 'Reactivate User'}
        description={
          deactivateTarget?.is_active
            ? `This will immediately revoke all sessions for ${deactivateTarget.full_name} and prevent future login.`
            : `This will re-enable login for ${deactivateTarget?.full_name}.`
        }
        confirmLabel={deactivateTarget?.is_active ? 'Deactivate' : 'Reactivate'}
        variant={deactivateTarget?.is_active ? 'danger' : 'info'}
        loading={deactivateUser.isPending || activateUser.isPending}
      />

      {/* ── Reset MFA Confirm ── */}
      <LBDConfirmDialog
        open={!!mfaResetTarget}
        onCancel={() => setMfaResetTarget(null)}
        onConfirm={handleMfaReset}
        title="Reset MFA"
        description={`This will remove all MFA factors for ${mfaResetTarget?.full_name}. They will be required to set up MFA again on next login.`}
        confirmLabel="Reset MFA"
        variant="warning"
        loading={resetMFA.isPending}
      />
    </div>
  );
}
