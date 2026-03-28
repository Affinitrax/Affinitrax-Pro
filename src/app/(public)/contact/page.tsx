import ContactForm from "@/components/contact/ContactForm";

const contactInfo = [
  {
    label: "Telegram",
    value: "@Jochem_top",
    href: "https://t.me/Jochem_top",
    icon: "✈",
  },
  {
    label: "Email",
    value: "info@affinitrax.com",
    href: "mailto:info@affinitrax.com",
    icon: "◎",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#080810] pt-24 pb-24">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 text-center mb-16">
        <p className="text-sm font-medium text-[#94a3b8] uppercase tracking-widest mb-3">
          Start a Conversation.
        </p>
        <h1
          className="text-5xl md:text-6xl font-bold gradient-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Let&apos;s build your next deal.
        </h1>
      </section>

      {/* Two-column layout */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left — contact info */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass rounded-2xl p-8 border border-white/5 flex flex-col gap-6">
              <h2
                className="text-lg font-bold text-[#e2e8f0]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Reach us directly
              </h2>

              {contactInfo.map((item) => (
                <div key={item.label}>
                  <a
                    href={item.href}
                    className="flex items-start gap-4 group"
                  >
                    <span className="w-9 h-9 rounded-lg bg-[#13131f] border border-white/10 flex items-center justify-center text-[#00d4ff] text-base flex-shrink-0 group-hover:border-[#00d4ff]/40 transition-colors">
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-0.5">
                        {item.label}
                      </p>
                      <p className="text-[#e2e8f0] text-sm font-medium group-hover:text-[#00d4ff] transition-colors">
                        {item.value}
                      </p>
                    </div>
                  </a>
                  {item.label === "Telegram" && (
                    <a
                      href="https://t.me/Jochem_top"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-medium hover:bg-[#00d4ff]/20 transition-colors cursor-pointer mt-3"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                      Start a Deal on Telegram
                    </a>
                  )}
                </div>
              ))}

              <div className="border-t border-white/5 pt-5 space-y-2">
                <p className="text-sm text-[#94a3b8]">
                  <span className="text-[#e2e8f0] font-medium">Response time:</span>{" "}
                  Usually within 2 hours on Telegram.
                </p>
                <p className="text-sm text-[#94a3b8]">
                  We operate across EU, LATAM, and APAC time zones.
                </p>
              </div>
            </div>

            {/* Decorative signal */}
            <div className="glass rounded-2xl p-6 border border-white/5 text-center">
              <p
                className="text-sm font-medium gradient-text mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                All Signal. No Noise.
              </p>
              <p className="text-xs text-[#94a3b8]">
                Affinitrax &mdash; Traffic Brokerage Platform
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
