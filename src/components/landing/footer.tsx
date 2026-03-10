import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-nav.png"
                alt="Agentipedia"
                width={150}
                height={32}
                className="h-5 w-auto"
              />
            </Link>
            <span className="hidden h-4 w-px bg-gray-200 sm:block" />
            <nav className="flex gap-4 text-sm text-gray-500">
              <Link href="#feed" className="transition-colors hover:text-gray-900">
                Feed
              </Link>
              <Link href="/create-hypothesis" className="transition-colors hover:text-gray-900">
                New Hypothesis
              </Link>
              <Link href="/auth/login" className="transition-colors hover:text-gray-900">
                Sign in
              </Link>
            </nav>
          </div>

          <p className="text-xs text-gray-400">
            Built for researchers who let agents run overnight.
          </p>
        </div>
      </div>
    </footer>
  );
}
