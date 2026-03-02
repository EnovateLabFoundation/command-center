import { useState, useEffect, useRef } from 'react';
import { Shield, KeyRound, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Mode = 'totp' | 'recovery';

export default function MFAVerifyPage() {
  const { verifyMFA, useRecoveryCode, startMfaChallenge, isLoading, logout, user } = useAuth();

  const [mode, setMode] = useState<Mode>('totp');
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [challengeReady, setChallengeReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initiate challenge on mount
  useEffect(() => {
    startMfaChallenge()
      .then(() => setChallengeReady(true))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to start MFA challenge.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus input
  useEffect(() => {
    if (challengeReady) inputRef.current?.focus();
  }, [challengeReady, mode]);

  const handleTOTP = async () => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator.');
      return;
    }
    setError(null);
    try {
      await verifyMFA(code);
    } catch (err) {
      setCode('');
      setError(err instanceof Error ? err.message : 'Verification failed.');
    }
  };

  const handleRecovery = async () => {
    if (recoveryCode.trim().length < 10) {
      setError('Enter a valid recovery code.');
      return;
    }
    setError(null);
    try {
      await useRecoveryCode(recoveryCode);
    } catch (err) {
      setRecoveryCode('');
      setError(err instanceof Error ? err.message : 'Recovery code invalid or already used.');
    }
  };

  const handleCodeChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError(null);
    // Auto-submit when 6 digits entered
    if (digits.length === 6 && challengeReady) {
      setTimeout(() => {
        setError(null);
        verifyMFA(digits).catch(err => {
          setCode('');
          setError(err instanceof Error ? err.message : 'Verification failed.');
        });
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-card border border-border mb-4 glow-gold">
            <Shield className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.email && (
              <span className="font-mono text-accent">{user.email}</span>
            )}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-7 shadow-2xl">
          {/* Mode tabs */}
          <div className="flex bg-background rounded-lg p-1 mb-6 border border-border">
            <button
              onClick={() => { setMode('totp'); setError(null); setCode(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'totp' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Authenticator
            </button>
            <button
              onClick={() => { setMode('recovery'); setError(null); setRecoveryCode(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'recovery' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" /> Recovery Code
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── TOTP mode ──────────────────────────────────────────────── */}
          {mode === 'totp' && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Open your authenticator app and enter the current 6-digit code for{' '}
                  <strong className="text-foreground">LBD-SIP</strong>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="totp">
                  Authentication Code
                </label>
                <input
                  ref={inputRef}
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => handleCodeChange(e.target.value)}
                  disabled={!challengeReady || isLoading}
                  className="w-full px-4 py-3 bg-background border border-border rounded-md font-mono text-center text-3xl tracking-[0.6em] text-foreground
                    focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition-colors
                    placeholder:text-muted-foreground/30 disabled:opacity-50"
                  placeholder="000000"
                />
                <p className="text-xs text-muted-foreground text-right">
                  Code refreshes every 30 seconds
                </p>
              </div>

              <button
                onClick={handleTOTP}
                disabled={isLoading || !challengeReady || code.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-accent-foreground font-semibold rounded-md
                  hover:bg-gold-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Verify
              </button>
            </div>
          )}

          {/* ── Recovery code mode ─────────────────────────────────────── */}
          {mode === 'recovery' && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Enter one of your saved recovery codes. Each code can only be used once.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="recovery">
                  Recovery Code
                </label>
                <input
                  ref={inputRef}
                  id="recovery"
                  type="text"
                  value={recoveryCode}
                  onChange={e => {
                    setRecoveryCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-md font-mono text-sm tracking-widest text-accent
                    focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition-colors placeholder:text-muted-foreground/30 uppercase"
                  placeholder="XXXX-XXXX-XXXX"
                />
              </div>

              <button
                onClick={handleRecovery}
                disabled={isLoading || recoveryCode.trim().length < 10}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-accent-foreground font-semibold rounded-md
                  hover:bg-gold-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                Use Recovery Code
              </button>

              <p className="text-xs text-muted-foreground text-center">
                No recovery codes left?{' '}
                <a href="mailto:admin@lbd.com" className="text-accent hover:text-gold-bright">
                  Contact your administrator
                </a>
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => logout()}
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to sign in
        </button>
      </div>
    </div>
  );
}
