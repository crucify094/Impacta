export function Footer() {
  return (
    <footer className="relative w-full border-t border-white/5 mt-16 print:hidden">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="text-[10px] font-mono text-white/30 tracking-[0.25em] uppercase">
          © {new Date().getFullYear()} IMPACTA OSINT
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 tracking-[0.25em] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
          <span>All systems operational</span>
        </div>
      </div>
    </footer>
  );
}
