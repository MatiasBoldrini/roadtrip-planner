"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { theme } from "@/lib/theme";

export { useEffect, useRef, useState } from "react";

export function useHostTheme() {
  return theme;
}

export function useCanvasState<T>(
  key: string,
  initial: T,
): [T, (action: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`viaje:${key}`);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore broken cache */
    }
  }, [key]);

  const persist = (action: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof action === "function" ? (action as (prev: T) => T)(prev) : action;
      try {
        localStorage.setItem(`viaje:${key}`, JSON.stringify(next));
      } catch {
        /* quota */
      }
      return next;
    });
  };

  return [value, persist];
}

export function Stack({
  children,
  gap = 0,
  style,
}: {
  children?: ReactNode;
  gap?: number;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>{children}</div>
  );
}

const alignMap = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
} as const;

const justifyMap = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  "space-between": "space-between",
} as const;

export function Row({
  children,
  gap = 0,
  align,
  justify,
  wrap,
  style,
}: {
  children?: ReactNode;
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between";
  wrap?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap,
        alignItems: align ? alignMap[align] : undefined,
        justifyContent: justify ? justifyMap[justify] : undefined,
        flexWrap: wrap ? "wrap" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Divider({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        height: 1,
        background: theme.stroke.secondary,
        ...style,
      }}
    />
  );
}

export function Text({
  children,
  tone = "primary",
  size,
  weight,
  style,
}: {
  children?: ReactNode;
  tone?: "primary" | "secondary" | "tertiary" | "quaternary";
  size?: "body" | "small";
  weight?: "normal" | "medium" | "semibold" | "bold";
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        color: theme.text[tone],
        fontSize: size === "small" ? theme.type.sm : theme.type.md,
        fontWeight: weight === "semibold" ? 600 : weight === "bold" ? 700 : weight === "medium" ? 500 : 400,
        lineHeight: 1.4,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function H1({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <h1
      style={{
        margin: "4px 0 0",
        fontSize: theme.type.lg,
        fontWeight: 650,
        letterSpacing: "-0.03em",
        color: theme.text.primary,
        ...style,
      }}
    >
      {children}
    </h1>
  );
}

export function H2({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: theme.type.md,
        fontWeight: 600,
        color: theme.text.primary,
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

export function Link({
  children,
  href,
  style,
}: {
  children?: ReactNode;
  href: string;
  style?: CSSProperties;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: theme.text.link, ...style }}>
      {children}
    </a>
  );
}

export function Button({
  children,
  variant = "primary",
  disabled,
  type = "button",
  style,
  onClick,
}: {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const bg =
    variant === "primary"
      ? theme.accent.primary
      : variant === "secondary"
        ? theme.fill.secondary
        : "transparent";
  const color = variant === "primary" ? theme.text.onAccent : theme.text.primary;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 8,
        padding: `${theme.control.padY}px ${theme.control.padX}px`,
        background: bg,
        color,
        font: "inherit",
        fontSize: theme.type.sm,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  disabled,
  title,
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  size?: "sm" | "md";
  variant?: "default" | "circle";
  style?: CSSProperties;
}) {
  const dim = size === "sm" ? 22 : 28;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: dim,
        height: dim,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        borderRadius: 6,
        background: "transparent",
        color: theme.text.secondary,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        font: "inherit",
      }}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
  active,
  size = "md",
  onClick,
  title,
  className,
}: {
  children?: ReactNode;
  active?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const Tag = onClick ? "button" : "span";
  const compact = size === "sm";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      title={title}
      onClick={onClick}
      aria-pressed={onClick ? Boolean(active) : undefined}
      className={[className, compact && "is-inline", active && "is-active", "ui-pill"]
        .filter(Boolean)
        .join(" ")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        boxSizing: "border-box",
        minHeight: compact ? 22 : theme.control.height,
        height: compact ? 22 : undefined,
        border: "none",
        borderRadius: theme.control.radius,
        padding: compact ? "0 8px" : `${theme.control.padY}px ${theme.control.padX}px`,
        color: active ? theme.text.onAccent : theme.text.primary,
        font: "inherit",
        fontSize: theme.type.sm,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </Tag>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  style,
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: "text" | "email" | "password" | "number" | "url" | "search";
  style?: CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      style={{
        width: "100%",
        height: theme.control.height,
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: 8,
        background: theme.bg.elevated,
        color: theme.text.primary,
        padding: `0 ${theme.control.padX}px`,
        font: "inherit",
        fontSize: theme.type.sm,
        ...style,
      }}
    />
  );
}

const CardCtx = createContext({
  open: true,
  collapsible: false,
  toggle: () => {},
});

export function Card({
  children,
  collapsible,
  defaultOpen = true,
  style,
}: {
  children?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  variant?: string;
  size?: string;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <CardCtx.Provider
      value={{
        open,
        collapsible: Boolean(collapsible),
        toggle: () => setOpen((current) => !current),
      }}
    >
      <div
        style={{
          border: `1px solid ${theme.stroke.secondary}`,
          borderRadius: 12,
          background: theme.bg.elevated,
          overflow: "hidden",
          ...style,
        }}
      >
        {children}
      </div>
    </CardCtx.Provider>
  );
}

export function CardHeader({
  children,
  trailing,
}: {
  children?: ReactNode;
  trailing?: ReactNode;
  style?: CSSProperties;
}) {
  const ctx = useContext(CardCtx);
  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "10px 14px",
        fontSize: theme.type.md,
        fontWeight: 600,
        color: theme.text.primary,
      }}
    >
      <span>{children}</span>
      {trailing}
    </div>
  );
  if (!ctx.collapsible) return inner;
  return (
    <button
      type="button"
      onClick={ctx.toggle}
      style={{
        width: "100%",
        border: "none",
        background: "transparent",
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
        font: "inherit",
      }}
    >
      {inner}
    </button>
  );
}

export function CardBody({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  const ctx = useContext(CardCtx);
  if (ctx.collapsible && !ctx.open) return null;
  return <div style={{ padding: 14, ...style }}>{children}</div>;
}

export function Table({
  headers,
  rows,
  columnAlign,
}: {
  headers: ReactNode[];
  rows: ReactNode[][];
  columnAlign?: Array<"left" | "center" | "right" | undefined>;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: theme.type.sm }}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                style={{
                  textAlign: columnAlign?.[index] ?? "left",
                  color: theme.text.tertiary,
                  fontWeight: 500,
                  padding: "6px 8px",
                  borderBottom: `1px solid ${theme.stroke.secondary}`,
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((_, col) => (
                <td
                  key={col}
                  style={{
                    textAlign: columnAlign?.[col] ?? "left",
                    padding: "7px 8px",
                    color: theme.text.primary,
                    borderBottom: `1px solid ${theme.stroke.tertiary}`,
                  }}
                >
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
