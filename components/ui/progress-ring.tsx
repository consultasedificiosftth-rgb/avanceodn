import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Anillo de progreso — elemento de firma del producto. Se reutiliza tal
 * cual en el header del portal del proveedor, en la tabla de PDs del
 * admin y en el detalle de PD, para que sea el elemento que identifica
 * visualmente a todo el portal.
 */
export function ProgressRing({
  value,
  size = 64,
  strokeWidth,
  className,
  icon,
  valueClassName,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  icon?: ReactNode;
  valueClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const sw = strokeWidth ?? Math.max(3, Math.round(size * 0.09));
  const radius = (size - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={icon ? undefined : `${Math.round(clamped)}% ODN`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={sw}
          className="stroke-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={sw}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-signal transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {icon ?? (
          <span
            className={cn(
              "font-display font-semibold tabular-nums leading-none text-foreground",
              valueClassName
            )}
            style={{ fontSize: size * 0.3 }}
          >
            {Math.round(clamped)}
            <span
              className="ml-0.5 align-top text-muted-foreground"
              style={{ fontSize: size * 0.16 }}
            >
              %
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
