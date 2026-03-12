import Image from "next/image";
import Link from "next/link";

type FooterProps = {
  readonly user?: { readonly x_handle: string } | null;
};

export function Footer({ user }: FooterProps) {
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
              <Link href="/blog" className="transition-colors hover:text-gray-900">
                Blog
              </Link>
              <Link href="/hypotheses/new" className="transition-colors hover:text-gray-900">
                New Hypothesis
              </Link>
              {user ? (
                <Link
                  href={`/users/${user.x_handle}`}
                  className="transition-colors hover:text-gray-900"
                >
                  Your Profile
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="transition-colors hover:text-gray-900"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://x.com/agentipedia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-900"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-current"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @agentipedia
            </a>
            <span className="hidden h-3 w-px bg-gray-200 sm:block" />
            <p className="text-xs text-gray-400">
              Built for researchers who let agents run overnight.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
