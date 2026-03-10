import Link from "next/link";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  readonly heading: string;
  readonly description: string;
  readonly action?: { readonly label: string; readonly href: string };
};

export function EmptyState({ heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <Inbox className="size-12 text-gray-400" />
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-800">{heading}</h3>
        <p className="max-w-sm text-sm text-gray-500">{description}</p>
      </div>
      {action && (
        <Button render={<Link href={action.href} />} variant="secondary" nativeButton={false}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
