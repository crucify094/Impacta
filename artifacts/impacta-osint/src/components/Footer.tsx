import { Terminal } from "lucide-react";
import { FaDiscord, FaXTwitter, FaGithub } from "react-icons/fa6";

const groups = [
  {
    title: "Platform",
    links: ["Services", "Features", "Pricing", "Changelog", "Status"],
  },
  {
    title: "Company",
    links: ["About", "Operators", "Careers", "Press"],
  },
  {
    title: "Legal",
    links: ["Terms", "Privacy", "Acceptable Use", "Disclosure"],
  },
];

export function Footer() {
  return (
    <footer className="relative w-full border-t border-white/5 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Terminal className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm tracking-widest uppercase">IMPACTA OSINT</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-sm mb-8">
              Advanced OSINT and multi-tool platform for intelligence gathering and threat analysis.
              Quiet, surgical, professional.
            </p>
            <div className="flex items-center gap-3">
              {[
                { Icon: FaDiscord, href: "https://discord.gg/qBBwY2qhc" },
                { Icon: FaXTwitter, href: "#" },
                { Icon: FaGithub, href: "#" },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noreferrer" : undefined}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  <Icon className="w-4 h-4 text-white/70" />
                </a>
              ))}
            </div>
          </div>

          {groups.map((group) => (
            <div key={group.title}>
              <h4 className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 mb-5">
                {group.title}
              </h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-xs font-mono text-white/30 tracking-wider">
            © {new Date().getFullYear()} IMPACTA OSINT. All rights reserved.
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 tracking-[0.25em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
