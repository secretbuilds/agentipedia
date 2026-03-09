import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-200"
      >
        Back to feed
      </Link>
    </div>
  );
}
