import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { Link } from "wouter";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4 transition-all duration-500 ${
        scrolled ? "pt-4" : "pt-8"
      }`}
    >
      <nav className="flex items-center justify-between px-6 py-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl w-full max-w-4xl">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest uppercase">IMPACTA OSINT</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wider text-white/60">
          <a href="#services" className="hover:text-white transition-colors uppercase">Services</a>
          <a href="#features" className="hover:text-white transition-colors uppercase">Features</a>
          <a href="#stats" className="hover:text-white transition-colors uppercase">Stats</a>
          <a href="#pricing" className="hover:text-white transition-colors uppercase">Pricing</a>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="#pricing"
            className="hidden md:flex items-center justify-center px-5 py-2 text-xs font-semibold tracking-wider text-black uppercase bg-white rounded-full hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
          >
            Get Access
          </a>
        </div>
      </nav>
    </motion.header>
  );
}
