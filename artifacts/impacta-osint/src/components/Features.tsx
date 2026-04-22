import { motion } from "framer-motion";
import { Lock, Zap, Eye, GitBranch } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Zero-footprint architecture",
    description:
      "Queries are routed through ephemeral, isolated nodes. No logs, no retention, no breadcrumbs back to your operation.",
  },
  {
    icon: Zap,
    title: "Sub-second pivots",
    description:
      "An in-memory selector graph means cross-source pivots return in milliseconds, even across billions of records.",
  },
  {
    icon: Eye,
    title: "Operator-grade UI",
    description:
      "Designed with practicing investigators. Keyboard-first, dense when you need density, quiet when you need focus.",
  },
  {
    icon: GitBranch,
    title: "Composable workflows",
    description:
      "Chain modules into reusable playbooks. Triage incoming leads in a workflow that fires on every new selector.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative w-full py-32 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-20 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono tracking-[0.2em] text-white/60 uppercase">
            <span className="w-1 h-1 rounded-full bg-white/80" />
            <span>03 / Why IMPACTA</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.05] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
            Built by operators, for operators.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group relative p-10 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/[0.04] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative">
                <div className="w-12 h-12 mb-6 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all">
                  <feature.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-white/50 leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
