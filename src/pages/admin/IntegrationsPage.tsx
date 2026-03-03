/**
 * IntegrationsPage
 *
 * Data Integration Console — manages third-party platform connections,
 * API key storage, sync schedules, and sync operation logs.
 * Accessible only to super_admin users.
 *
 * All third-party API calls are routed through Edge Functions.
 * API keys are stored encrypted in integration_configs; the frontend
 * never sends keys to external services directly.
 */

import { useState, useMemo } from 'react';
import {
  PlugZap, Settings2, RefreshCw, TestTube, Clock, CheckCircle2,
  XCircle, AlertTriangle, WifiOff, Eye, EyeOff, Save, Loader2,
  Upload, FileSpreadsheet,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { LBDPageHeader, LBDDrawer } from '@/components/ui/lbd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import {
  useIntegrations,
  SYNC_FREQUENCIES,
  type PlatformDefinition,
  type IntegrationConfig,
} from '@/hooks/useIntegrations';

/* ── Status badge component ─────────────────────────────────────────────────── */

/** Maps integration status to a styled badge */
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
    healthy: {
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: 'Healthy',
    },
    error: {
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: <XCircle className="w-3 h-3" />,
      label: 'Error',
    },
    degraded: {
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: <AlertTriangle className="w-3 h-3" />,
      label: 'Degraded',
    },
    not_configured: {
      className: 'bg-muted/50 text-muted-foreground border-border',
      icon: <WifiOff className="w-3 h-3" />,
      label: 'Not Configured',
    },
  };

  const v = variants[status] ?? variants.not_configured;
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${v.className}`}>
      {v.icon}
      {v.label}
    </Badge>
  );
}

/* ── Sync log status badge ──────────────────────────────────────────────────── */

function SyncStatusBadge({ status }: { status: string }) {
  if (status === 'success') return <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 text-xs">Success</Badge>;
  if (status === 'error') return <Badge variant="outline" className="bg-red-500/20 text-red-400 text-xs">Error</Badge>;
  if (status === 'running') return <Badge variant="outline" className="bg-blue-500/20 text-blue-400 text-xs">Running</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

/* ── Platform card ──────────────────────────────────────────────────────────── */

function PlatformCard({
  platform,
  status,
  config,
  onConfigure,
  onTestConnection,
  onSyncNow,
}: {
  platform: PlatformDefinition;
  status: string;
  config: IntegrationConfig | undefined;
  onConfigure: () => void;
  onTestConnection: () => void;
  onSyncNow: () => void;
}) {
  const lastSync = config?.last_sync_at
    ? formatDistanceToNow(new Date(config.last_sync_at), { addSuffix: true })
    : null;

  const syncFreq = (config?.config as any)?.sync_frequency ?? null;

  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{platform.icon}</span>
            <div>
              <CardTitle className="text-sm font-semibold">{platform.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{platform.description}</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Sync info row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lastSync ? `Last sync: ${lastSync}` : 'Never synced'}
          </span>
          {syncFreq && <span className="capitalize">{syncFreq}</span>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={onConfigure}>
            <Settings2 className="w-3 h-3 mr-1" /> Configure
          </Button>
          {status !== 'not_configured' && (
            <>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={onTestConnection}>
                <TestTube className="w-3 h-3" />
              </Button>
              {platform.syncFunction && (
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={onSyncNow}>
                  <RefreshCw className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Configure Drawer ───────────────────────────────────────────────────────── */

function ConfigureDrawer({
  platform,
  config,
  open,
  onClose,
  onSave,
  isSaving,
}: {
  platform: PlatformDefinition | null;
  config: IntegrationConfig | undefined;
  open: boolean;
  onClose: () => void;
  onSave: (params: { platformName: string; apiKey: string; config: Record<string, unknown>; syncFrequency: string; existingId?: string }) => Promise<void>;
  isSaving: boolean;
}) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState('manual');
  const [customConfig, setCustomConfig] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);

  /* Populate form when drawer opens with existing config */
  const resetForm = () => {
    if (config) {
      setApiKey(''); // Never pre-fill the key for security
      setSyncFrequency((config.config as any)?.sync_frequency ?? 'manual');
      setIsActive(config.is_active);
      const cfg = (config.config ?? {}) as Record<string, string>;
      setCustomConfig(cfg);
    } else {
      setApiKey('');
      setSyncFrequency('manual');
      setIsActive(true);
      setCustomConfig({});
    }
  };

  // Reset when platform changes
  useState(() => { resetForm(); });

  if (!platform) return null;

  /** Mask API key to show only last 4 characters */
  const maskedKey = config?.api_key_encrypted
    ? `••••••••••••${config.api_key_encrypted.slice(-4)}`
    : null;

  const handleSave = async () => {
    await onSave({
      platformName: platform.key,
      apiKey,
      config: { ...customConfig, sync_frequency: syncFrequency },
      syncFrequency,
      existingId: config?.id,
    });
    onClose();
  };

  return (
    <LBDDrawer open={open} onClose={onClose} title={`Configure ${platform.name}`}>
      <div className="space-y-6 p-1">
        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <Label>Integration Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <Separator />

        {/* API Key */}
        <div className="space-y-2">
          <Label>API Key</Label>
          {maskedKey && (
            <p className="text-xs text-muted-foreground">
              Current: <code className="bg-muted px-1 rounded">{maskedKey}</code>
            </p>
          )}
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config ? 'Enter new key to replace' : 'Enter API key'}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Platform-specific config fields */}
        {platform.configFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            {field.type === 'select' && field.options ? (
              <Select
                value={customConfig[field.key] ?? ''}
                onValueChange={(v) => setCustomConfig((prev) => ({ ...prev, [field.key]: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={customConfig[field.key] ?? ''}
                onChange={(e) => setCustomConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
              />
            )}
          </div>
        ))}

        <Separator />

        {/* Sync frequency */}
        <div className="space-y-2">
          <Label>Sync Frequency</Label>
          <Select value={syncFrequency} onValueChange={setSyncFrequency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SYNC_FREQUENCIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save button */}
        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Configuration
        </Button>
      </div>
    </LBDDrawer>
  );
}

/* ── Sync Logs Table ────────────────────────────────────────────────────────── */

function SyncLogsPanel({
  logs,
  isLoading,
}: {
  logs: any[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No sync operations recorded yet. Configure an integration and trigger a sync.
      </p>
    );
  }

  return (
    <div className="border border-border rounded-md overflow-auto max-h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Platform</TableHead>
            <TableHead className="text-xs">Triggered At</TableHead>
            <TableHead className="text-xs">Duration</TableHead>
            <TableHead className="text-xs">Records</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-xs font-medium">{log.platform_name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(log.triggered_at), 'dd MMM HH:mm')}
              </TableCell>
              <TableCell className="text-xs">
                {log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
              </TableCell>
              <TableCell className="text-xs">{log.records_ingested ?? '—'}</TableCell>
              <TableCell><SyncStatusBadge status={log.status} /></TableCell>
              <TableCell className="text-xs text-red-400 max-w-[200px] truncate">
                {log.error_message ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ── Data Upload Panel ──────────────────────────────────────────────────────── */

/**
 * DataUploadPanel — allows super_admin to upload CSV for INEC/NBS data.
 * Sends CSV content to data-upload Edge Function for parsing and bulk insert.
 */
function DataUploadPanel() {
  const { toast: showToast } = useToast();
  const [dataType, setDataType] = useState('election_results');
  const [csvContent, setCsvContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    rows_parsed?: number; rows_inserted?: number;
    rows_skipped?: number; validation_errors?: string[];
  } | null>(null);

  const DATA_TYPES = [
    { value: 'election_results', label: 'Election Results', icon: '🗳️' },
    { value: 'voter_registration', label: 'Voter Registration', icon: '📋' },
    { value: 'nbs_demographics', label: 'NBS Demographics', icon: '📊' },
    { value: 'polling_data', label: 'Polling Data', icon: '📍' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      showToast({ title: 'Only CSV files are supported', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => { setCsvContent(ev.target?.result as string ?? ''); setResult(null); };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!csvContent.trim()) { showToast({ title: 'No CSV content', variant: 'destructive' }); return; }
    setIsUploading(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('data-upload', {
        body: { data_type: dataType, csv_content: csvContent },
      });
      if (error) throw error;
      setResult(data);
      showToast({ title: 'Upload complete', description: `${data.rows_inserted} rows inserted, ${data.rows_skipped} skipped.` });
    } catch (err: any) {
      showToast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally { setIsUploading(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Upload Data File (CSV)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.icon} {dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input type="file" accept=".csv" onChange={handleFileChange} />
          </div>
          {csvContent && (
            <div className="space-y-2">
              <Label>Preview (first 500 chars)</Label>
              <Textarea value={csvContent.slice(0, 500) + (csvContent.length > 500 ? '...' : '')} readOnly className="h-24 text-xs font-mono" />
              <p className="text-xs text-muted-foreground">{csvContent.split('\n').length - 1} data rows detected</p>
            </div>
          )}
          <Button onClick={handleUpload} disabled={isUploading || !csvContent} className="w-full">
            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload &amp; Import
          </Button>
          {result && (
            <Card className="bg-muted/30 border-border/30">
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm font-semibold">Import Summary</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-bold">{result.rows_parsed ?? 0}</p><p className="text-xs text-muted-foreground">Parsed</p></div>
                  <div><p className="text-lg font-bold text-emerald-400">{result.rows_inserted ?? 0}</p><p className="text-xs text-muted-foreground">Inserted</p></div>
                  <div><p className="text-lg font-bold text-amber-400">{result.rows_skipped ?? 0}</p><p className="text-xs text-muted-foreground">Skipped</p></div>
                </div>
                {result.validation_errors && result.validation_errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-red-400">Errors:</p>
                    <ul className="text-xs text-muted-foreground list-disc pl-4">
                      {result.validation_errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/30">
            <p className="font-medium">Expected CSV columns by data type:</p>
            <p><strong>Election Results / Voter Registration / Polling:</strong> state, lga, ward, polling_unit_code, registered_voters, last_election_votes, winning_party</p>
            <p><strong>NBS Demographics:</strong> lga_name, state, population_estimate, median_income, poverty_rate, literacy_rate, urban_rural</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



export default function IntegrationsPage() {
  const {
    configs, isLoadingConfigs, syncLogs, isLoadingSyncLogs,
    saveConfig, isSaving, testConnection, triggerSync,
    getConfigForPlatform, getPlatformStatus, platforms,
  } = useIntegrations();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformDefinition | null>(null);

  /** Open the configure drawer for a given platform */
  const openConfigure = (platform: PlatformDefinition) => {
    setSelectedPlatform(platform);
    setDrawerOpen(true);
  };

  /** Count of configured / healthy integrations */
  const healthyCounts = useMemo(() => {
    let configured = 0;
    let healthy = 0;
    platforms.forEach((p) => {
      const status = getPlatformStatus(p.key);
      if (status !== 'not_configured') configured++;
      if (status === 'healthy') healthy++;
    });
    return { configured, healthy, total: platforms.length };
  }, [configs, platforms, getPlatformStatus]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <LBDPageHeader
        eyebrow="PLATFORM · ADMIN"
        title="Data Integration Console"
        description="Configure API keys, sync schedules, and monitor third-party platform connections."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{healthyCounts.configured}</p>
            <p className="text-xs text-muted-foreground">Configured</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{healthyCounts.healthy}</p>
            <p className="text-xs text-muted-foreground">Healthy</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{healthyCounts.total}</p>
            <p className="text-xs text-muted-foreground">Total Platforms</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Platforms | Sync Logs | Upload Data */}
      <Tabs defaultValue="platforms">
        <TabsList>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
          <TabsTrigger value="upload">Upload Data</TabsTrigger>
        </TabsList>

        {/* ── Platforms grid ── */}
        <TabsContent value="platforms" className="mt-4">
          {isLoadingConfigs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platforms.map((p) => (
                <PlatformCard
                  key={p.key}
                  platform={p}
                  status={getPlatformStatus(p.key)}
                  config={getConfigForPlatform(p.key)}
                  onConfigure={() => openConfigure(p)}
                  onTestConnection={() => testConnection(p.key)}
                  onSyncNow={() => triggerSync(p.key)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Sync Logs ── */}
        <TabsContent value="logs" className="mt-4">
          <SyncLogsPanel logs={syncLogs} isLoading={isLoadingSyncLogs} />
        </TabsContent>

        {/* ── Upload Data ── */}
        <TabsContent value="upload" className="mt-4">
          <DataUploadPanel />
        </TabsContent>
      </Tabs>

      {/* Configure Drawer */}
      <ConfigureDrawer
        platform={selectedPlatform}
        config={selectedPlatform ? getConfigForPlatform(selectedPlatform.key) : undefined}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={saveConfig}
        isSaving={isSaving}
      />
    </div>
  );
}
