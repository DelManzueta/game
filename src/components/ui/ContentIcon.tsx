import type { ImgHTMLAttributes } from "react";
import { cnJoin } from "@/components/ui/primitives";
import {
  ICON_FRAME,
  iconForEngineComponent,
  iconForField,
  iconForResearch,
} from "@/lib/game/content/researchIcons";

type Size = number | "sm" | "md" | "lg" | "xl";
const SIZE_PX = { sm: 28, md: 40, lg: 52, xl: 72 } as const;

type Base = {
  size?: Size;
  className?: string;
  framed?: boolean;
  label?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height">;

function px(size: Size) {
  return typeof size === "number" ? size : SIZE_PX[size];
}

function Shell({
  src,
  size = "md",
  className,
  framed = true,
  label,
  ...rest
}: Base & { src: string }) {
  const dim = px(size);
  const img = (
    <img
      src={src}
      alt={label ?? ""}
      width={dim}
      height={dim}
      draggable={false}
      aria-hidden={label ? undefined : true}
      className={cnJoin("object-contain", !framed && className)}
      style={{ width: dim, height: dim }}
      {...rest}
    />
  );
  if (!framed) return img;
  return (
    <span
      className={cnJoin(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: dim, height: dim }}
    >
      <img
        src={ICON_FRAME}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-90"
        draggable={false}
      />
      <span className="relative z-[1] flex h-[72%] w-[72%] items-center justify-center">
        <img
          src={src}
          alt={label ?? ""}
          className="max-h-full max-w-full object-contain"
          draggable={false}
          aria-hidden={label ? undefined : true}
        />
      </span>
    </span>
  );
}

export function ResearchIcon({
  id,
  category,
  ...rest
}: Base & { id: string; category?: string }) {
  return <Shell src={iconForResearch(id, category)} label={rest.label} {...rest} />;
}

export function EngineIcon({
  id,
  category,
  ...rest
}: Base & { id: string; category?: string }) {
  return <Shell src={iconForEngineComponent(id, category)} label={rest.label} {...rest} />;
}

export function FieldIcon({ field, ...rest }: Base & { field: string }) {
  return <Shell src={iconForField(field)} label={rest.label} {...rest} />;
}
