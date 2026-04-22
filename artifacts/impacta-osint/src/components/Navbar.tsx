import { motion } from "framer-motion";
import { Terminal, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4"
    >
      <nav className="flex items-center justify-between px-6 py-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl w-full max-w-4xl">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest uppercase">
            IMPACTA OSINT
          </span>
        </Link>

        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">
          <ShieldCheck className="w-3.5 h-3.5 text-white/60" />
          <span>Encrypted Session</span>
        </div>
      </nav>
    </motion.header>
  );
}
