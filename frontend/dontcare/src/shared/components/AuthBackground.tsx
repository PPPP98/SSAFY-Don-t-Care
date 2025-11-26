export function AuthBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden">
      {/* Dark base with subtle radial glows */}
      <div className="absolute inset-0 bg-black" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(2000px_1500px_at_18%_22%,rgba(167,139,250,0.16),transparent),radial-gradient(2200px_1600px_at_82%_28%,rgba(99,102,241,0.12),transparent)]" />
      {/* Aurora effect for depth */}
      <div className="bg-aurora/30 absolute inset-0 animate-aurora bg-[length:200%_200%]" />
    </div>
  );
}
