import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";

const tiers = [
  {
    name: "Recon",
    price: "29",
    cadence: "/ mo",
    tagline: "For freelance investigators getting started.",
    features: [
      "1,000 selector lookups / month",
      "Identity + breach modules",
      "Standard query queue",
      "Community support",
    ],
    highlight: false,
  },
  {
    name: "Operative",
    price: "129",
    cadence: "/ mo",
    tagline: "For working analysts who run cases daily.",
    features: [
      "25,000 selector lookups / month",
      "Full module suite + workflows",
      "Priority query queue",
      "Saved investigations & exports",
      "Email + Discord support",
    ],
    highlight: true,
  },
  {
    name: "Agency",
    price: "Custom",
    cadence: "",
    tagline: "For teams, units, and managed providers.",
    features: [
      "Unlimited lookups",
      "Dedicated infra + SSO",
      "Audit log + role-based access",
      "API access & webhooks",
      "Named technical contact",
    ],
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative w-full py-32 px-6 border-t border-white/5">
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
            <span>04 / Pricing</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.05] mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
            Pick the tier that matches your operation.
          </h2>
          <p className="text-white/50 text-lg max-w-2xl leading-relaxed">
            Transparent pricing. No data resold. No surprise overages — quotas are hard-capped by default.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
              className={`relative p-8 md:p-10 rounded-2xl border transition-all duration-500 flex flex-col ${
                tier.highlight
                  ? "bg-white text-black border-white shadow-[0_0_60px_rgba(255,255,255,0.15)]"
                  : "bg-white/[0.02] text-white border-white/10 hover:border-white/20"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-white text-[10px] font-mono tracking-widest uppercase rounded-full border border-white/20">
                  Most Adopted
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-sm font-mono uppercase tracking-[0.25em] mb-4 opacity-60">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-3">
                  {tier.price !== "Custom" && (
                    <span className={`text-2xl font-light ${tier.highlight ? "opacity-60" : "opacity-40"}`}>
                      $
                    </span>
                  )}
                  <span className="text-5xl md:text-6xl font-black tracking-tighter">{tier.price}</span>
                  <span className={`text-sm ml-1 ${tier.highlight ? "opacity-60" : "opacity-40"}`}>
                    {tier.cadence}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${tier.highlight ? "opacity-70" : "opacity-50"}`}>
                  {tier.tagline}
                </p>
              </div>

              <ul className="space-y-3 mb-10 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        tier.highlight ? "text-black" : "text-white"
                      }`}
                      strokeWidth={2.5}
                    />
                    <span className={tier.highlight ? "text-black/80" : "text-white/70"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`group flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all ${
                  tier.highlight
                    ? "bg-black text-white hover:bg-black/85"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <span>{tier.price === "Custom" ? "Contact Sales" : "Get Started"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
