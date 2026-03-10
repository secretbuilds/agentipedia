import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-lg text-gray-500">Page not found</p>
      <p className="max-w-sm text-sm text-gray-400">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button render={<Link href="/" />} variant="secondary" nativeButton={false}>
        Back to home
      </Button>
    </div>
  );
}
