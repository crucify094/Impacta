import { motion } from "framer-motion";
import { ArrowRight, Code2 } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import { useEffect, useState } from "react";
import { Link } from "wouter";

function BinaryBackground() {
  const [matrix, setMatrix] = useState("");

  useEffect(() => {
    const chars = "01";
    let output = "";
    for (let i = 0; i < 2000; i++) {
      output += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i % 50 === 0) output += "\n";
    }
    setMatrix(output);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] select-none mix-blend-screen">
      <pre className="text-[10px] font-mono text-white leading-none tracking-widest opacity-50 absolute -top-[50%] -left-[50%] w-[200%] h-[200%] transform -rotate-12 flex items-center justify-center">
        {matrix}
      </pre>
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/80 to-black" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black" />
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative w-full min-h-[100dvh] flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden">
      <BinaryBackground />

      {/* Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-white/70 uppercase"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>System Online • V2.4.1</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-6 leading-tight"
        >
          PRECISION. <br className="hidden md:block" />
          INTELLIGENCE. <br className="hidden md:block" />
          IMPACTA.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-base md:text-xl text-white/50 max-w-2xl mb-12 font-light leading-relaxed"
        >
          The clandestine multi-tool platform for advanced digital investigations. 
          Uncover hidden connections, analyze metadata, and conduct surgical threat analysis in a secure, zero-footprint environment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            href="/explore"
            className="group relative flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-white text-black font-bold tracking-widest uppercase text-sm rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]"
          >
            <span className="relative z-10 flex items-center gap-2">
              Explore Tools
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <a
            href="https://discord.gg/qBBwY2qhc"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white font-bold tracking-widest uppercase text-sm rounded-full transition-all hover:bg-white/10 hover:border-white/20"
          >
            <FaDiscord className="w-5 h-5" />
            <span>Join Discord</span>
          </a>
        </motion.div>
      </div>

      {/* Decorative lines */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute left-1/2 bottom-0 w-px h-24 bg-gradient-to-t from-white/20 to-transparent -translate-x-1/2" />
    </section>
  );
}
