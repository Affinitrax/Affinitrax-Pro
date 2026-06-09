import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CODE_LINES = [
  { indent: 0, text: "POST /api/v1/leads", color: "#475569", isComment: true },
  { indent: 0, text: "{", color: "#e2e8f0" },
  { indent: 1, text: '"email":',     value: '"lead@example.com"',  keyColor: "#7dd3fc", valColor: "#86efac" },
  { indent: 1, text: '"phone":',     value: '"+4917612345678"',    keyColor: "#7dd3fc", valColor: "#86efac" },
  { indent: 1, text: '"country":',   value: '"DE"',                keyColor: "#7dd3fc", valColor: "#86efac" },
  { indent: 1, text: '"click_id":',  value: '"abc_xyz_123"',       keyColor: "#7dd3fc", valColor: "#86efac" },
  { indent: 0, text: "}", color: "#e2e8f0" },
  { indent: 0, text: "", color: "transparent" },
  { indent: 0, text: "// Response", color: "#475569", isComment: true },
  { indent: 0, text: "{", color: "#e2e8f0" },
  { indent: 1, text: '"status":',    value: '"relayed"',           keyColor: "#7dd3fc", valColor: "#fde68a" },
  { indent: 1, text: '"lead_id":',   value: '"afx_lead_9f2c..."',  keyColor: "#7dd3fc", valColor: "#86efac" },
  { indent: 0, text: "}", color: "#e2e8f0" },
];

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
          fontFamily: "monospace",
          overflow: "hidden",
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Ambient glow top-left */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, transparent 70%)",
            top: -150,
            left: -100,
            display: "flex",
          }}
        />

        {/* Ambient glow bottom-right */}
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(124,58,237,0.06) 0%, transparent 70%)",
            bottom: -100,
            right: 100,
            display: "flex",
          }}
        />

        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 4,
            height: "100%",
            background: "linear-gradient(180deg, transparent 0%, #00d4ff 30%, #7c3aed 70%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* LEFT CONTENT */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 0 60px 72px",
            width: 580,
            position: "relative",
            zIndex: 2,
            fontFamily: "sans-serif",
          }}
        >
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 44 }}>
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
                Developer Docs
              </span>
            </div>
          </div>

          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(0,212,255,0.2)",
              borderRadius: 8,
              padding: "7px 14px",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4ff", display: "flex" }} />
            <span style={{ color: "#00d4ff", fontSize: 13, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>
              REST API v1
            </span>
          </div>

          {/* Main headline */}
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: "#e2e8f0", lineHeight: 1.1, letterSpacing: "-1.5px" }}>
              Seller API
            </span>
            <span style={{ fontSize: 56, fontWeight: 800, color: "#00d4ff", lineHeight: 1.1, letterSpacing: "-1.5px" }}>
              Reference
            </span>
          </div>

          {/* Subline */}
          <span style={{ fontSize: 19, color: "#64748b", letterSpacing: "0.01em", lineHeight: 1.5, marginBottom: 40 }}>
            S2S lead submission · Postback tracking · JSON/REST
          </span>

          {/* Chips */}
          <div style={{ display: "flex", gap: 10 }}>
            {["POST /leads", "X-API-Key", "Postbacks", "S2S"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 14px",
                  borderRadius: 7,
                  background: "rgba(124,58,237,0.08)",
                  border: "1px solid rgba(124,58,237,0.2)",
                }}
              >
                <span style={{ color: "#a78bfa", fontSize: 13, fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL — code block */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: 580,
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
              background: "linear-gradient(180deg, transparent, rgba(0,212,255,0.18) 30%, rgba(124,58,237,0.18) 70%, transparent)",
              display: "flex",
            }}
          />

          {/* Code block card */}
          <div
            style={{
              margin: "0 52px",
              width: "100%",
              background: "rgba(13,17,23,0.95)",
              border: "1px solid rgba(0,212,255,0.12)",
              borderRadius: 14,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Title bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ef4444", display: "flex" }} />
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#f59e0b", display: "flex" }} />
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#22c55e", display: "flex" }} />
              <span style={{ color: "#334155", fontSize: 12, marginLeft: 8, letterSpacing: "0.05em" }}>
                affinitrax-api.json
              </span>
            </div>

            {/* Code lines */}
            <div style={{ display: "flex", flexDirection: "column", padding: "18px 20px", gap: 2 }}>
              {CODE_LINES.map((line, i) => (
                <div key={i} style={{ display: "flex", fontFamily: "monospace", fontSize: 13.5, lineHeight: 1.7 }}>
                  <span style={{ color: "#1e293b", width: 24, flexShrink: 0, userSelect: "none" }}>{i + 1}</span>
                  <span style={{ marginLeft: line.indent * 20 }}>
                    {line.isComment ? (
                      <span style={{ color: "#475569" }}>{line.text}</span>
                    ) : line.value !== undefined ? (
                      <>
                        <span style={{ color: line.keyColor }}>{line.text}</span>
                        <span style={{ color: "#64748b" }}> </span>
                        <span style={{ color: line.valColor }}>{line.value}</span>
                        <span style={{ color: "#64748b" }}>,</span>
                      </>
                    ) : (
                      <span style={{ color: line.color }}>{line.text}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Domain watermark */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 72,
            display: "flex",
            color: "#1e293b",
            fontSize: 14,
            letterSpacing: "0.12em",
            fontFamily: "sans-serif",
          }}
        >
          affinitrax.com/docs/seller-api
        </div>
      </div>
    ),
    { ...size }
  );
}
