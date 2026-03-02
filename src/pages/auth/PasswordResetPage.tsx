import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type FormData = z.infer<typeof schema>;

export default function PasswordResetPage() {
  const { requestPasswordReset } = useAuth();
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(data.email);
      setSentTo(data.email);
      setSent(true);
    } catch (err) {
      // Don't leak whether email exists — show generic message
      setSentTo(data.email);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-card border border-border mb-4">
            <span className="font-mono font-black text-xl text-accent tracking-widest">LBD</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            We'll send a secure reset link to your email
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-7 shadow-2xl">
          {!sent ? (
            <>
              {error && (
                <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-accent-foreground font-semibold rounded-md
                    hover:bg-gold-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {submitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-success/10 border border-success/30 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-success" />
                </div>
              </div>
              <div>
                <h2 className="font-semibold text-foreground mb-2">Check Your Email</h2>
                <p className="text-sm text-muted-foreground">
                  If an account exists for{' '}
                  <span className="font-mono text-accent">{sentTo}</span>, a reset link has been
                  sent. Check your inbox and spam folder.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                The link expires in 1 hour for security.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
