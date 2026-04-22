import { motion } from "framer-motion";
import { Search, Database, Globe, Shield, Network, Fingerprint } from "lucide-react";

const services = [
  {
    icon: Search,
    title: "Identity Lookup",
    description:
      "Pivot across emails, usernames, phone numbers, and IPs. Resolve real-world identities from sparse digital fragments.",
  },
  {
    icon: Database,
    title: "Breach Intelligence",
    description:
      "Query a federated index of leaked datasets, exposed credentials, and dark-web spills with surgical precision.",
  },
  {
    icon: Globe,
    title: "Domain & Infra Recon",
    description:
      "Map subdomains, DNS history, certificates, ASN ownership, and hosting fingerprints in a single sweep.",
  },
  {
    icon: Network,
    title: "Social Graph Analysis",
    description:
      "Trace cross-platform relationships, infer affiliations, and surface shadow accounts with link analysis.",
  },
  {
    icon: Fingerprint,
    title: "Metadata Forensics",
    description:
      "Strip and analyze EXIF, document properties, and hidden artifacts. Authorship attribution at scale.",
  },
  {
    icon: Shield,
    title: "Threat Surface Monitor",
    description:
      "Continuous monitoring of exposure, mentions, and emerging indicators tied to your selectors.",
  },
];

export function Services() {
  return (
    <section id="services" className="relative w-full py-32 px-6 border-t border-white/5">
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
            <span>01 / Capabilities</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.05] mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
            A complete arsenal for the modern investigator.
          </h2>
          <p className="text-white/50 text-lg max-w-2xl leading-relaxed">
            Every IMPACTA module is engineered around a single principle: signal over noise. No filler,
            no theatrics — just the data points that move a case forward.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="group relative bg-black p-8 hover:bg-white/[0.02] transition-colors duration-500"
            >
              <div className="w-12 h-12 mb-6 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                <service.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">{service.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{service.description}</p>
              <div className="absolute top-6 right-6 text-[10px] font-mono text-white/20 tracking-widest">
                {String(i + 1).padStart(2, "0")}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
