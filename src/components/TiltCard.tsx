import { useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "../lib/cn";

/**
 * A card that tilts in 3D toward the pointer and casts a cursor spotlight —
 * the cheap, everywhere version of the Three.js stage. Reduced-motion users
 * get a static card (no tilt, no spotlight).
 */
export function TiltCard({
  children,
  className,
  intensity = 7,
  spotlight = true,
}: {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees. */
  intensity?: number;
  spotlight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [style, setStyle] = useState<{
    transform: string;
    spotX: string;
    spotY: string;
  }>({ transform: "", spotX: "50%", spotY: "50%" });

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateX(${(-py * intensity).toFixed(2)}deg) rotateY(${(px * intensity).toFixed(2)}deg) translateZ(4px)`,
      spotX: `${((px + 0.5) * 100).toFixed(1)}%`,
      spotY: `${((py + 0.5) * 100).toFixed(1)}%`,
    });
  }

  function onLeave() {
    if (reduced) return;
    setStyle({ transform: "", spotX: "50%", spotY: "50%" });
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        "relative transition-transform duration-200 ease-out will-change-transform",
        className,
      )}
      style={{
        transform: style.transform,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
      {spotlight && !reduced && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background: `radial-gradient(260px circle at ${style.spotX} ${style.spotY}, rgba(167,139,250,0.14), transparent 65%)`,
          }}
        />
      )}
    </div>
  );
}
