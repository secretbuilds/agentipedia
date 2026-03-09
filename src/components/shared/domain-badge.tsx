import { Badge } from "@/components/ui/badge";
import {
  DOMAIN_LABELS,
  DOMAIN_COLORS,
  type Domain,
} from "@/lib/utils/constants";

export function DomainBadge({ domain }: { readonly domain: string }) {
  const label = DOMAIN_LABELS[domain as Domain] ?? domain;
  const color = DOMAIN_COLORS[domain as Domain] ?? "var(--domain-other)";

  return (
    <Badge
      variant="secondary"
      className="border-transparent text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </Badge>
  );
}
