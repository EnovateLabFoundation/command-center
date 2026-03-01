const Unauthorized = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="font-mono text-sm tracking-widest text-accent">ACCESS DENIED</p>
        <h1 className="text-3xl font-bold text-foreground">CLEARANCE INSUFFICIENT</h1>
        <p className="text-muted-foreground max-w-md">
          Your current role does not have permission to access this resource. 
          Contact your system administrator for elevated access.
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;
