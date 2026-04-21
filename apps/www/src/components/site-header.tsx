import { Menu, X } from "lucide-react";
import { useState } from "react";

interface NavigationItem {
  href: string;
  label: string;
  external?: boolean;
}

const navigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Overview" },
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#use-cases", label: "Use Cases" },
  { href: "/#open-source", label: "Open Source" },
  { href: "/#faq", label: "FAQ" },
  { href: "/docs", label: "Docs" },
  {
    href: "https://github.com/dafthunk-com/dafthunk",
    label: "GitHub",
    external: true,
  },
];

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-4 bg-neutral-100 border-b border-neutral-200">
      <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <img src="/icon.svg" alt="Dafthunk" className="h-8 w-8" />
          <span className="text-2xl font-semibold text-gray-900">dafthunk</span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex gap-8 items-center">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-base text-gray-600 hover:text-gray-900"
              {...(item.external && {
                target: "_blank",
                rel: "noopener noreferrer",
              })}
            >
              {item.label}
            </a>
          ))}
          <a
            href={import.meta.env.VITE_APP_URL}
            className="text-base bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            Sign in
          </a>
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden text-gray-600 hover:text-gray-900"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="lg:hidden mt-4 flex flex-col gap-4 pb-4">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-base text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
              {...(item.external && {
                target: "_blank",
                rel: "noopener noreferrer",
              })}
            >
              {item.label}
            </a>
          ))}
          <a
            href={import.meta.env.VITE_APP_URL}
            className="text-base bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-center"
          >
            Sign in
          </a>
        </nav>
      )}
    </header>
  );
}
