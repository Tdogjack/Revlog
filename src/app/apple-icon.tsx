import { ImageResponse } from "next/og";

// Home-screen icon for iPhones and iPads, matching icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#121417",
      }}
    >
      <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
        <path
          d="M3.34 19a10 10 0 1 1 17.32 0"
          stroke="#e63946"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="m12 14 4-4" stroke="#e63946" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>,
    size,
  );
}
