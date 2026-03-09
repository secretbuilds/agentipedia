import { DOMAINS, DOMAIN_COLORS } from "@/lib/utils/constants";

type DomainBadgeProps = {
  domain: string;
};

export function DomainBadge({ domain }: DomainBadgeProps) {
  const label =
    DOMAINS.find((d) => d.value === domain)?.label ?? domain;
  const color =
    DOMAIN_COLORS[domain as keyof typeof DOMAIN_COLORS] ?? "var(--color-domain-other)";

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}
