import { Bot, FileText, Github, Shield } from "lucide-react";
import { Link } from "react-router";

export function HomeFooter() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "Links",
      links: [
        {
          label: "Workflows",
          to: "/org/workflows",
        },
        {
          label: "Features",
          to: "/#features",
        },
        {
          label: "Documentation",
          to: "/docs",
        },
      ],
    },
    {
      title: "About",
      links: [
        {
          label: "Privacy Policy",
          href: "/legal",
          icon: <Shield className="h-4 w-4 mr-2" />,
        },
        {
          label: "Terms of Service",
          href: "/legal",
          icon: <FileText className="h-4 w-4 mr-2" />,
        },
      ],
    },
    {
      title: "Community",
      links: [
        {
          label: "GitHub",
          href: "https://github.com/heigvd-software-engineering/workflow",
          icon: <Github className="h-4 w-4 mr-2" />,
        },
        // Add other community links here if needed
      ],
    },
  ];

  return (
    <footer className="bg-white dark:bg-black border-t mt-8 md:mt-16">
      <div className="container mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Logo and Copyright - Spans 2 columns on larger screens if needed or adjust grid */}
          <div className="md:col-span-1 lg:col-span-1 flex flex-col items-start">
            <Link to="/" className="flex items-center">
              <Bot className="h-6 w-6 text-foreground" />
            </Link>
          </div>

          {/* Navigation Links */}
          {footerSections.map((section) => (
            <div key={section.title} className="text-left">
              <h3 className="font-semibold text-foreground mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center"
                      >
                        {link.icon}
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center"
                      >
                        {link.icon}
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row gap-2 justify-between items-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} Dafthunk. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
