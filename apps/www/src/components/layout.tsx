import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import categories from "../../data/categories.json";
import workflowsData from "../../data/workflows.json";

interface NavigationItem {
  href: string;
  label: string;
  external?: boolean;
}

interface LayoutProps {
  children: ReactNode;
  navigation: NavigationItem[];
}

export function Layout({ children, navigation }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="sticky top-0 z-50 w-full px-6 py-4 bg-stone-100">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/icon.svg" alt="Dafthunk" className="h-8 w-8" />
            <span className="text-2xl font-semibold text-gray-900">
              dafthunk
            </span>
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
              className="text-base bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
            >
              Sign in
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
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
              className="text-base bg-black text-white px-4 py-2 rounded hover:bg-gray-800 text-center"
            >
              Sign in
            </a>
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full">{children}</main>

      <footer className="w-full bg-black text-gray-300 px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-8">
          <div>
            <a href="/">
              <img
                src="/icon.svg"
                alt="Dafthunk"
                className="h-8 w-8 brightness-0 invert"
              />
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-white text-base font-semibold mb-1">Product</h3>
            <a href="/" className="text-base hover:text-white">
              Home
            </a>
            <a href="#features" className="text-base hover:text-white">
              Overview
            </a>
            <a href="#capabilities" className="text-base hover:text-white">
              Capabilities
            </a>
            <a href="#use-cases" className="text-base hover:text-white">
              Use Cases
            </a>
            <a href="#open-source" className="text-base hover:text-white">
              Open Source
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-white text-base font-semibold mb-1">
              Use Cases
            </h3>
            {workflowsData.workflows.map((workflow) => (
              <a
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                className="text-base hover:text-white"
              >
                {workflow.name}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-white text-base font-semibold mb-1">
              Capabilities
            </h3>
            {categories.categories.map((category) => (
              <a
                key={category.id}
                href={`/nodes/${category.id}`}
                className="text-base hover:text-white"
              >
                {category.name}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-white text-base font-semibold mb-1">
              Resources
            </h3>
            <a
              href={`${import.meta.env.VITE_APP_URL}/docs/concepts`}
              className="text-base hover:text-white"
            >
              Documentation
            </a>
            <a
              href={`${import.meta.env.VITE_APP_URL}/docs/nodes`}
              className="text-base hover:text-white"
            >
              Nodes Reference
            </a>
            <a
              href={`${import.meta.env.VITE_APP_URL}/docs/api`}
              className="text-base hover:text-white"
            >
              API Reference
            </a>
            <a
              href={`${import.meta.env.VITE_APP_URL}/docs/developers`}
              className="text-base hover:text-white"
            >
              Developers Guide
            </a>
            <a
              href="https://github.com/dafthunk-com/dafthunk/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base hover:text-white"
            >
              Support
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-white text-base font-semibold mb-1">About</h3>
            <a
              href="https://github.com/dafthunk-com/dafthunk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base hover:text-white"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/Z6xHWA9sPN"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base hover:text-white"
            >
              Discord
            </a>
            <a href="/terms" className="text-base hover:text-white">
              Terms of Service
            </a>
            <a href="/privacy" className="text-base hover:text-white">
              Privacy Policy
            </a>
            <a href="/cookies" className="text-base hover:text-white">
              Cookie Policy
            </a>
          </div>
        </div>
        <div>
          <p className="text-base text-gray-400">
            © 2025 Dafthunk. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
