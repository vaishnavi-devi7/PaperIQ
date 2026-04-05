"use client";

export default function LoadingCard({
  lines = 3,
  minHeight = 160,
}: {
  lines?: number;
  minHeight?: number;
}) {
  return (
    <div
      className="feature-card"
      style={{
        padding: 24,
        minHeight,
        display: "grid",
        gap: 12,
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <div
        style={{
          width: "38%",
          height: 14,
          borderRadius: 999,
          background: "rgba(148, 163, 184, 0.22)",
        }}
      />
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          style={{
            width: index === lines - 1 ? "72%" : "100%",
            height: 12,
            borderRadius: 999,
            background: "rgba(148, 163, 184, 0.16)",
          }}
        />
      ))}
    </div>
  );
}