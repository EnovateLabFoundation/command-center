import { useState, useEffect } from 'react';
import { Shield, Copy, Check, AlertTriangle, ChevronRight, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { generateRecoveryCodes } from '@/lib/supabase';

type Step = 'qr' | 'recovery' | 'confirm';

export default function MFASetupPage() {
  const { enrollMFA, completeMFASetup, isLoading, logout } = useAuth();

  const [step, setStep] = useState<Step>('qr');
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      setEnrolling(true);
      try {
        const result = await enrollMFA();
        if (!mounted) return;
        setQrCodeSvg(result.qrCodeSvg);
        setSecret(result.secret);
        setFactorId(result.factorId);
        setRecoveryCodes(generateRecoveryCodes(8));
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'MFA enrollment failed.');
      } finally {
        if (mounted) setEnrolling(false);
      }
    };
    start();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleConfirm = async () => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setError(null);
    try {
      await completeMFASetup(code, factorId, recoveryCodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    }
  };

  const qrDataUrl = qrCodeSvg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCodeSvg)}`
    : '';

  if (enrolling) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="font-mono text-sm text-muted-foreground">PREPARING MFA SETUP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-card border border-border mb-4 glow-gold">
            <Shield className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Set Up Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground mt-1">
            MFA is mandatory for your role. Complete setup to access the platform.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['qr', 'recovery', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold border transition-colors ${
                  step === s
                    ? 'bg-accent text-accent-foreground border-accent'
                    : s === 'confirm' && step === 'confirm'
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-card text-muted-foreground border-border'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-7 shadow-2xl">
          {error && (
            <div className="mb-5 flex items-start gap-2 px-3 py-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Step 1: Scan QR ─────────────────────────────────────────── */}
          {step === 'qr' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-foreground mb-1">Scan QR Code</h2>
                <p className="text-sm text-muted-foreground">
                  Open <strong className="text-foreground">Google Authenticator</strong> or{' '}
                  <strong className="text-foreground">Authy</strong>, tap "Add account", and scan
                  the code below.
                </p>
              </div>

              {qrDataUrl && (
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-xl">
                    <img src={qrDataUrl} alt="MFA QR Code" className="w-44 h-44" />
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Can't scan? Enter this key manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs text-accent bg-background border border-border rounded px-3 py-2 tracking-widest break-all">
                    {secret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="p-2 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Copy secret"
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('recovery')}
                className="w-full py-2.5 bg-accent text-accent-foreground font-semibold rounded-md hover:bg-gold-bright transition-colors text-sm"
              >
                I've scanned the code — Continue
              </button>
            </div>
          )}

          {/* ── Step 2: Recovery codes ───────────────────────────────────── */}
          {step === 'recovery' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-foreground mb-1">Save Recovery Codes</h2>
                <p className="text-sm text-muted-foreground">
                  Store these codes securely. Each code can only be used{' '}
                  <strong className="text-foreground">once</strong> to regain access if you lose
                  your authenticator device.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((c, i) => (
                  <code
                    key={i}
                    className="font-mono text-xs text-accent bg-background border border-border rounded px-3 py-1.5 tracking-wider text-center"
                  >
                    {c}
                  </code>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyCodes}
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-border rounded-md text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  {copiedCodes ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {copiedCodes ? 'Copied!' : 'Copy all codes'}
                </button>
                <button
                  onClick={() => setRecoveryCodes(generateRecoveryCodes(8))}
                  className="p-2 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Regenerate codes"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={savedConfirmed}
                  onChange={e => setSavedConfirmed(e.target.checked)}
                  className="mt-0.5 accent-accent"
                />
                <span className="text-sm text-foreground">
                  I have saved my recovery codes in a safe place
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('qr')}
                  className="flex-1 py-2.5 border border-border rounded-md text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!savedConfirmed}
                  className="flex-1 py-2.5 bg-accent text-accent-foreground font-semibold rounded-md hover:bg-gold-bright transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm code ─────────────────────────────────────── */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-foreground mb-1">Confirm Your Authenticator</h2>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code currently shown in your authenticator app to complete
                  setup.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="totp-confirm">
                  Verification Code
                </label>
                <input
                  id="totp-confirm"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
                  autoFocus
                  className="w-full px-4 py-3 bg-background border border-border rounded-md font-mono text-center text-2xl tracking-[0.5em] text-foreground
                    focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition-colors placeholder:text-muted-foreground/30"
                  placeholder="000000"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('recovery')}
                  className="flex-1 py-2.5 border border-border rounded-md text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading || code.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent text-accent-foreground font-semibold rounded-md hover:bg-gold-bright transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  Activate MFA
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => logout()}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out and return to login
        </button>
      </div>
    </div>
  );
}
