import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "#07070f",
          position: "relative",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {/* ── Background grid ──────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0,212,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* ── Right-side ambient glow ───────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(0,212,255,0.09) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)",
            top: -100,
            right: -80,
          }}
        />

        {/* ── Bottom-left subtle glow ───────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(124,58,237,0.06) 0%, transparent 70%)",
            bottom: -150,
            left: -50,
          }}
        />

        {/* ── Left accent bar ───────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 4,
            height: "100%",
            background: "linear-gradient(180deg, transparent 0%, #00d4ff 30%, #7c3aed 70%, transparent 100%)",
          }}
        />

        {/* ── LEFT CONTENT (55% width) ──────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 0 60px 72px",
            width: 660,
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 13,
                background: "#0d1117",
                border: "1.5px solid rgba(0,212,255,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="34" height="34" viewBox="0 0 100 100" fill="none">
                <defs>
                  <linearGradient id="ga" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#60eeff" />
                    <stop offset="100%" stopColor="#00b8d9" />
                  </linearGradient>
                </defs>
                <polygon points="10,90 24,90 56,12 42,12" fill="url(#ga)" />
                <polygon points="44,12 58,12 90,90 76,90" fill="url(#ga)" />
                <polygon points="30,58 70,58 68,67 32,67" fill="url(#ga)" />
                <polygon points="42,12 56,12 34,42 20,42" fill="#06060e" />
                <polygon points="48,24 62,24 40,54 26,54" fill="#06060e" />
                <polygon points="46,12 54,12 50,6" fill="rgba(200,252,255,0.7)" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.5px" }}>
                Affinitrax
              </span>
              <span style={{ fontSize: 11, color: "#475569", letterSpacing: "2.5px", textTransform: "uppercase" }}>
                Partner Portal
              </span>
            </div>
          </div>

          {/* Main headline */}
          <div
            style={{
              fontSize: 58,
              fontWeight: 800,
              color: "#e2e8f0",
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              marginBottom: 20,
            }}
          >
            Premium Traffic
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #00d4ff 0%, #7c3aed 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Brokerage Platform
            </span>
          </div>

          {/* Subline */}
          <div
            style={{
              fontSize: 21,
              color: "#64748b",
              letterSpacing: "0.02em",
              marginBottom: 44,
              lineHeight: 1.5,
            }}
          >
            Verified buyers & sellers. CPA &amp; CRG models.
            <br />
            S2S tracking. Invite-only network.
          </div>

          {/* Stat chips */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "CPA & CRG", icon: "◈" },
              { label: "S2S Tracking", icon: "⬡" },
              { label: "10+ GEOs", icon: "◉" },
              { label: "Invite Only", icon: "◆" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 16px",
                  borderRadius: 8,
                  background: "rgba(0,212,255,0.06)",
                  border: "1px solid rgba(0,212,255,0.18)",
                }}
              >
                <span style={{ color: "#00d4ff", fontSize: 13 }}>{item.icon}</span>
                <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL (abstract visual) ────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: 540,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Vertical separator */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 60,
              bottom: 60,
              width: 1,
              background: "linear-gradient(180deg, transparent, rgba(0,212,255,0.2) 30%, rgba(124,58,237,0.2) 70%, transparent)",
            }}
          />

          {/* Stacked metric cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: "0 64px",
              width: "100%",
            }}
          >
            {/* Card 1 */}
            <div
              style={{
                background: "rgba(13,17,23,0.9)",
                border: "1px solid rgba(0,212,255,0.15)",
                borderRadius: 14,
                padding: "22px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ color: "#475569", fontSize: 12, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                  Active Deals
                </span>
                <span style={{ color: "#e2e8f0", fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>
                  48
                </span>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "rgba(0,212,255,0.1)",
                  border: "1px solid rgba(0,212,255,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                📊
              </div>
            </div>

            {/* Card 2 */}
            <div
              style={{
                background: "rgba(13,17,23,0.9)",
                border: "1px solid rgba(124,58,237,0.2)",
                borderRadius: 14,
                padding: "22px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ color: "#475569", fontSize: 12, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                  Verified Partners
                </span>
                <span style={{ color: "#e2e8f0", fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>
                  120+
                </span>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                🤝
              </div>
            </div>

            {/* Card 3 */}
            <div
              style={{
                background: "rgba(13,17,23,0.9)",
                border: "1px solid rgba(0,212,255,0.12)",
                borderRadius: 14,
                padding: "22px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ color: "#475569", fontSize: 12, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                  Verticals
                </span>
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  {["Crypto", "FX", "Casino"].map((v) => (
                    <span
                      key={v}
                      style={{
                        color: "#00d4ff",
                        fontSize: 14,
                        fontWeight: 600,
                        background: "rgba(0,212,255,0.08)",
                        padding: "3px 10px",
                        borderRadius: 5,
                      }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "rgba(0,212,255,0.07)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                🌐
              </div>
            </div>
          </div>
        </div>

        {/* ── Domain watermark ─────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 72,
            color: "#1e293b",
            fontSize: 15,
            letterSpacing: "0.12em",
          }}
        >
          affinitrax.com
        </div>
      </div>
    ),
    { ...size }
  );
}
