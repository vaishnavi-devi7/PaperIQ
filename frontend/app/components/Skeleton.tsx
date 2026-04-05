"use client";

export default function Skeleton({ height = 20 }: { height?: number }) {
  return (
    <div
      className="skeleton"
      style={{
        height,
        borderRadius: 12,
        width: "100%",
        marginBottom: 10,
      }}
    />
  );
}