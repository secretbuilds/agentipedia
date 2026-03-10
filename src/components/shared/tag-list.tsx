import { Badge } from "@/components/ui/badge";

type TagListProps = {
  readonly tag1: string | null;
  readonly tag2: string | null;
};

export function TagList({ tag1, tag2 }: TagListProps) {
  const tags = [tag1, tag2].filter(Boolean) as readonly string[];

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className="text-xs text-gray-600">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
