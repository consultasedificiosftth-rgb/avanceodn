"use client";

import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Toggle compacto para la fila de NAP del portal del proveedor. El
 * control visual es chico pero la fila (label + checkbox + padding)
 * mantiene una zona de toque real >= 44px de alto, pensada para
 * usarse en el campo, a veces con guantes.
 */
export function NapToggle({
  id,
  checked,
  disabled,
  busy,
  label,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  busy?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 transition-colors",
        checked ? "text-signal" : "text-muted-foreground",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      {busy ? (
        <Loader2 className="size-4 shrink-0 animate-spin" />
      ) : (
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => onCheckedChange(Boolean(v))}
          className={cn(
            "size-[18px] shrink-0 rounded-[5px] border-2 border-line [&_svg]:size-3",
            "data-checked:border-signal data-checked:bg-signal data-checked:text-signal-foreground"
          )}
        />
      )}
      <span className="whitespace-nowrap text-xs font-semibold">{label}</span>
    </label>
  );
}
