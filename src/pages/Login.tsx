const Login = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-[0.3em] text-accent">LBD-SIP</p>
          <h1 className="text-2xl font-bold text-foreground">
            Strategic Intelligence Platform
          </h1>
          <p className="text-sm text-muted-foreground">
            Secure authentication required
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Authentication module pending backend integration.
          </p>
          <p className="mt-2 font-mono text-xs text-accent">
            Enable Lovable Cloud to activate auth.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
