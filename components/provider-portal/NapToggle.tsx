"use client";

import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Toggle grande para el portal del proveedor: fila completa como zona de
 * toque (>= 44px de alto), pensado para usarse en el campo, a veces con
 * guantes. Envuelve el mismo Checkbox de shadcn — la lógica de
 * tildar/destildar vive en el componente que lo usa.
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
        "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
        checked ? "border-signal bg-signal/10" : "border-line bg-surface active:bg-surface-raised",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <span className="text-base font-medium text-foreground">{label}</span>
      <span className="flex items-center gap-2.5">
        {busy && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => onCheckedChange(Boolean(v))}
          className={cn(
            "size-7 rounded-lg border-2 border-line [&_svg]:size-4",
            "data-checked:border-signal data-checked:bg-signal data-checked:text-signal-foreground"
          )}
        />
      </span>
    </label>
  );
}
