import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, Mail, Shield, AlertTriangle } from 'lucide-react';
import { useAuth, getLockoutStatus } from '@/hooks/useAuth';
import { LOGIN_MAX_ATTEMPTS } from '@/lib/supabase';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

const REASON_MESSAGES: Record<string, string> = {
  inactivity: 'Session ended due to 30 minutes of inactivity.',
  expired: 'Your 8-hour session has expired. Please sign in again.',
};

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const watchedEmail = watch('email', '');

  // Poll lockout countdown
  useEffect(() => {
    if (!watchedEmail) return;
    const tick = () => {
      const { remainingMs } = getLockoutStatus(watchedEmail);
      setLockoutRemaining(remainingMs);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [watchedEmail]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await login(data.email, data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    }
  };

  const lockMins = Math.ceil(lockoutRemaining / 60000);
  const lockSecs = Math.ceil((lockoutRemaining % 60000) / 1000);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border mb-4 glow-gold">
            <span className="font-mono font-black text-2xl text-accent tracking-widest">LBD</span>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Strategic Intelligence Platform
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono tracking-wider">
            SECURE ACCESS PORTAL
          </p>
        </div>

        {/* Session expiry / inactivity banner */}
        {reason && REASON_MESSAGES[reason] && (
          <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{REASON_MESSAGES[reason]}</span>
          </div>
        )}

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Sign In</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your credentials to access the platform
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  {...register('email')}
                  className={`w-full pl-10 pr-4 py-2.5 bg-background border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50
                    focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition-colors
                    ${errors.email ? 'border-destructive' : 'border-border'}`}
                  placeholder="advisor@lbd.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/auth/reset-password"
                  className="text-xs text-accent hover:text-gold-bright transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`w-full pl-10 pr-10 py-2.5 bg-background border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50
                    focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition-colors
                    ${errors.password ? 'border-destructive' : 'border-border'}`}
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Error / lockout */}
            {lockoutRemaining > 0 ? (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Account locked. Try again in{' '}
                  <span className="font-mono font-semibold">
                    {lockMins}:{String(lockSecs).padStart(2, '0')}
                  </span>
                </span>
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || lockoutRemaining > 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-accent text-accent-foreground font-semibold rounded-md
                hover:bg-gold-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Sign In Securely
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 font-mono">
          CONFIDENTIAL · LBD-SIP · AUTHORIZED ACCESS ONLY
        </p>
        <p className="text-center text-xs text-muted-foreground mt-1">
          Max {LOGIN_MAX_ATTEMPTS} attempts · 8-hour sessions · MFA enforced
        </p>
      </div>
    </div>
  );
}
