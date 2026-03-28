import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07070f",
          borderRadius: 40,
          position: "relative",
        }}
      >
        {/* Ambient inner glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 40,
            boxShadow: "inset 0 0 60px rgba(0,212,255,0.12)",
          }}
        />
        <svg
          width="130"
          height="130"
          viewBox="0 0 22 22"
          fill="none"
        >
          {/* Shadow faces */}
          <path d="M3 18 L9 4 L11.5 4 L5.5 18Z" fill="#005a70" />
          <path d="M11.5 4 L19 18 L16.5 18 L11.5 7Z" fill="#004d60" />

          {/* Main lit faces */}
          <path d="M4 18 L10 4 L12 4 L6 18Z" fill="url(#lf)" />
          <path d="M12 4 L18 18 L16 18 L12 6.5Z" fill="url(#rf)" />

          {/* Crossbar */}
          <path d="M7.2 13.5 L14.8 13.5 L14.2 15 L7.8 15Z" fill="url(#cb)" />

          {/* Highlight edge */}
          <path d="M10 4 L10.6 4 L5.2 17.5 L4.6 17.5Z" fill="rgba(180,245,255,0.6)" />

          {/* Apex highlight */}
          <path d="M10.5 4 L12 4 L11.5 5.5Z" fill="rgba(200,250,255,0.9)" />

          <defs>
            <linearGradient id="lf" x1="4" y1="4" x2="6" y2="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#40e8ff" />
              <stop offset="100%" stopColor="#00a8cc" />
            </linearGradient>
            <linearGradient id="rf" x1="18" y1="4" x2="16" y2="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00c4ee" />
              <stop offset="100%" stopColor="#0088aa" />
            </linearGradient>
            <linearGradient id="cb" x1="7" y1="13.5" x2="15" y2="15" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#30d8f8" />
              <stop offset="100%" stopColor="#00a8cc" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    { ...size }
  );
}
