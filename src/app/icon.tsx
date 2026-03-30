import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#06060e",
          borderRadius: 7,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="a" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60eeff" />
              <stop offset="100%" stopColor="#00b8d9" />
            </linearGradient>
            <linearGradient id="b" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#003d50" />
              <stop offset="100%" stopColor="#002535" />
            </linearGradient>
          </defs>
          {/* Shadow depth — left */}
          <polygon points="8,90 10,90 42,12 40,12" fill="url(#b)" />
          {/* Shadow depth — right */}
          <polygon points="58,12 60,12 92,90 90,90" fill="url(#b)" />
          {/* Left arm */}
          <polygon points="10,90 24,90 56,12 42,12" fill="url(#a)" />
          {/* Right arm */}
          <polygon points="44,12 58,12 90,90 76,90" fill="url(#a)" />
          {/* Crossbar */}
          <polygon points="30,58 70,58 68,67 32,67" fill="url(#a)" />
          {/* Diagonal cut 1 — creates the slice/stripe effect */}
          <polygon points="42,12 56,12 34,42 20,42" fill="#06060e" />
          {/* Diagonal cut 2 */}
          <polygon points="48,24 62,24 40,54 26,54" fill="#06060e" />
          {/* Apex highlight */}
          <polygon points="46,12 54,12 50,6" fill="rgba(200,252,255,0.7)" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
