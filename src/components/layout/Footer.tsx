import Link from "next/link";

const footerLinks = {
  Platform: [
    { label: "Buyers", href: "/buyers" },
    { label: "Sellers", href: "/sellers" },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Pricing", href: "/pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#080810] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span
              className="text-xl font-bold tracking-widest uppercase gradient-text block mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Affinitrax
            </span>
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              All Signal. No Noise.
              <br />
              Premium traffic brokerage for serious players.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-4">
                {group}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#94a3b8]">
            &copy; {new Date().getFullYear()} Affinitrax. All rights reserved.
          </p>
          <p className="text-xs text-[#94a3b8]">Built for traffic professionals.</p>
        </div>
      </div>
    </footer>
  );
}
