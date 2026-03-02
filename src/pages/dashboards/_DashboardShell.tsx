import { LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/stores/authStore';

interface Module {
  name: string;
  desc: string;
  icon: string;
}

interface DashboardShellProps {
  role: AppRole;
  label: string;
  subtitle: string;
  accentColor: string;
  modules: Module[];
}

export default function DashboardShell({
  label,
  subtitle,
  accentColor,
  modules,
}: DashboardShellProps) {
  const { user } = useAuthStore();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-card border border-border">
              <span className="font-mono font-black text-xs text-accent">LBD</span>
            </div>
            <div>
              <span className={`font-mono text-xs font-semibold tracking-widest ${accentColor}`}>
                {label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3 h-3 text-accent" />
              <span className="font-mono">MFA VERIFIED</span>
            </div>
            <div className="text-sm text-foreground font-medium hidden sm:block">
              {user?.full_name || user?.email}
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-10">
          <p className={`font-mono text-xs tracking-[0.3em] mb-1 ${accentColor}`}>{label}</p>
          <h1 className="text-3xl font-bold text-foreground">{subtitle}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Welcome back,{' '}
            <span className="text-foreground font-medium">{user?.full_name || user?.email}</span>.
            Your dashboard modules are listed below.
          </p>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <div
              key={mod.name}
              className="group bg-card border border-border rounded-xl p-6 hover:border-accent/40 hover:glow-gold transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl shrink-0">{mod.icon}</div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                    {mod.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">MODULE</span>
                <span className="text-xs font-mono text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  COMING SOON →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Build notice */}
        <div className="mt-12 p-4 bg-card border border-border/50 rounded-lg flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-gold shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-mono text-accent">LBD-SIP</span> — Authentication system active.
            Module implementations are in active development. All access is logged.
          </p>
        </div>
      </main>
    </div>
  );
}
