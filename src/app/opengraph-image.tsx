import { ImageResponse } from "next/og";

export const alt = "BayseBonds — near-certain Bayse predictions ending this year";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#f5f5f5",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>BayseBonds</div>
        <div
          style={{
            display: "flex",
            fontSize: 132,
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: "-0.05em",
            transform: "scaleX(0.82)",
            transformOrigin: "left",
          }}
        >
          put your idle capital to work
        </div>
      </div>
    ),
    size,
  );
}
