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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#07070f",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Glow blob center */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(0,212,255,0.10) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "#0d1117",
            border: "1.5px solid rgba(0,212,255,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg width="52" height="52" viewBox="0 0 22 22" fill="none">
            <path d="M3 18 L9 4 L11.5 4 L5.5 18Z" fill="#005a70" />
            <path d="M11.5 4 L19 18 L16.5 18 L11.5 7Z" fill="#004d60" />
            <path d="M4 18 L10 4 L12 4 L6 18Z" fill="#00c4ee" />
            <path d="M12 4 L18 18 L16 18 L12 6.5Z" fill="#00a8cc" />
            <path d="M7.2 13.5 L14.8 13.5 L14.2 15 L7.8 15Z" fill="#30d8f8" />
            <path d="M10 4 L10.6 4 L5.2 17.5 L4.6 17.5Z" fill="rgba(180,245,255,0.6)" />
            <path d="M10.5 4 L12 4 L11.5 5.5Z" fill="rgba(200,250,255,0.9)" />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-1px",
            marginBottom: 16,
          }}
        >
          Affinitrax
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: "#00d4ff",
            letterSpacing: "0.05em",
            marginBottom: 40,
          }}
        >
          All Signal. No Noise.
        </div>

        {/* Pill tags */}
        <div style={{ display: "flex", gap: 12 }}>
          {["Crypto", "FX", "Casino", "CPA · CRG", "10+ GEOs"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.2)",
                color: "#94a3b8",
                fontSize: 16,
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            color: "#334155",
            fontSize: 18,
            letterSpacing: "0.08em",
          }}
        >
          affinitrax.com
        </div>
      </div>
    ),
    { ...size }
  );
}
