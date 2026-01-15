import type { ComponentProps } from "react";

export type IconName =
  | "arrow-down"
  | "arrow-left"
  | "arrow-right"
  | "check"
  | "chevron-down"
  | "comment"
  | "filter"
  | "plus"
  | "reset"
  | "send"
  | "x";

type IconProps = ComponentProps<"svg"> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 14, className, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "plus":
      return (
        <svg {...common} {...rest}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common} {...rest}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common} {...rest}>
          <path d="M5 12h13M13 6l5 6-5 6" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...common} {...rest}>
          <path d="M19 12H6M11 6l-5 6 5 6" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} {...rest}>
          <path d="M5 13l4 4L19 7" />
        </svg>
      );
    case "x":
      return (
        <svg {...common} {...rest}>
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
      );
    case "send":
      return (
        <svg {...common} {...rest}>
          <path d="M3 11l18-8-8 18-2-8-8-2z" />
        </svg>
      );
    case "filter":
      return (
        <svg {...common} {...rest}>
          <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />
        </svg>
      );
    case "reset":
      return (
        <svg {...common} {...rest}>
          <path d="M20 12a8 8 0 1 1-2.34-5.66M20 5v5h-5" />
        </svg>
      );
    case "arrow-down":
      return (
        <svg {...common} {...rest}>
          <path d="M12 5v14M7 14l5 5 5-5" />
        </svg>
      );
    case "comment":
      return (
        <svg {...common} {...rest}>
          <path d="M4 5h16v10H7l-3 3V5z" />
        </svg>
      );
    default:
      return null;
  }
}
