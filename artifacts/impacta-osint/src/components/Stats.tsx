import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.floor(latest).toLocaleString());

  useEffect(() => {
    if (inView) {
      const controls = animate(count, value, { duration: 2.2, ease: [0.16, 1, 0.3, 1] });
      return () => controls.stop();
    }
  }, [inView, value, count]);

  return (
    <span className="inline-flex items-baseline">
      <motion.span ref={ref}>{rounded}</motion.span>
      <span>{suffix}</span>
    </span>
  );
}

const stats = [
  { value: 48, suffix: "B+", label: "Indexed records across breach corpora" },
  { value: 320, suffix: "M", label: "Domains profiled and continuously monitored" },
  { value: 17, suffix: "K", label: "Active investigators on the platform" },
  { value: 99.97, suffix: "%", label: "Query availability over the trailing 90 days" },
];

export function Stats() {
  return (
    <section id="stats" className="relative w-full py-32 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono tracking-[0.2em] text-white/60 uppercase">
            <span className="w-1 h-1 rounded-full bg-white/80" />
            <span>02 / By the numbers</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.05] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
            Operating at investigative scale.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="bg-black p-8 md:p-10"
            >
              <div className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-white">
                {Number.isInteger(stat.value) ? (
                  <Counter value={stat.value} suffix={stat.suffix} />
                ) : (
                  <span>
                    {stat.value}
                    {stat.suffix}
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-white/40 uppercase tracking-wider leading-relaxed">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
