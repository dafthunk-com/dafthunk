import {
  ArrowRight,
  CheckCircle,
  Cloud,
  Cpu,
  Database,
  GitFork,
  Layers,
  Palette,
  PlayCircle,
  Rocket,
  Share2,
  Workflow,
  Zap,
} from "lucide-react";
import { Link, Navigate } from "react-router";

import { HomeFooter } from "@/components/layouts/home-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-context";

export function HomePage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const features = [
    {
      icon: <Workflow className="h-8 w-8 text-primary" />,
      title: "Visual Workflow Editor",
      description:
        "Intuitive drag-and-drop interface to build and manage complex automation flows.",
    },
    {
      icon: <Cpu className="h-8 w-8 text-primary" />,
      title: "AI-Powered Nodes",
      description:
        "Leverage Cloudflare AI for text summarization, image analysis, and more, directly in your workflows.",
    },
    {
      icon: <Share2 className="h-8 w-8 text-primary" />,
      title: "Serverless Execution",
      description:
        "Run workflows efficiently on Cloudflare's global edge network without managing servers.",
    },
    {
      icon: <PlayCircle className="h-8 w-8 text-primary" />,
      title: "Real-time Monitoring",
      description:
        "Observe workflow executions and results as they happen, ensuring transparency and control.",
    },
    {
      icon: <Database className="h-8 w-8 text-primary" />,
      title: "Persistent Storage",
      description:
        "Securely save and retrieve your workflows using Cloudflare D1 database integration.",
    },
    {
      icon: <Rocket className="h-8 w-8 text-primary" />,
      title: "Modern & Performant",
      description:
        "Built with React, TailwindCSS, and Shadcn UI for a fast, responsive, and beautiful experience.",
    },
  ];

  const techStack = [
    { name: "React", icon: <Layers className="h-6 w-6" /> },
    { name: "TypeScript", icon: <Zap className="h-6 w-6" /> },
    { name: "TailwindCSS", icon: <Palette className="h-6 w-6" /> },
    { name: "Shadcn UI", icon: <Layers className="h-6 w-6" /> },
    { name: "React Flow", icon: <GitFork className="h-6 w-6" /> },
    { name: "Cloudflare", icon: <Cloud className="h-6 w-6" /> },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="py-24 md:py-32 lg:py-40 bg-gradient-to-br from-primary/15 via-primary/5 to-background">
        <div className="container mx-auto text-center px-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-3xl mx-auto font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">
              Build
            </span>{" "}
            and{" "}
            <span className="bg-gradient-to-r from-blue-500 via-primary to-purple-500 bg-clip-text text-transparent">
              automate
            </span>{" "}
            workflows with ease.
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            Break it, fix it, prompt it, automatic, automatic,...
            <br />A powerful, visual workflows with ease, powered by serverless
            & AI.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/workflows/playground">
                Start Building <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link to="/docs">Explore Docs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-20 md:py-28 bg-background border-t border-border"
      >
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold uppercase tracking-wider text-sm">
              Core Capabilities
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-2">
              Why Choose Dafthunk?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover the features that make Dafthunk the ideal solution for
              your workflow automation needs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="bg-card hover:shadow-lg transition-shadow duration-300 border"
              >
                <CardHeader className="flex flex-row items-start gap-4 p-6">
                  <div className="p-3 rounded-md bg-primary/10">
                    {feature.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">
                      {feature.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-28 bg-muted/30 dark:bg-neutral-800/50 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <span className="text-primary font-semibold uppercase tracking-wider text-sm">
                Streamlined Process
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-2 mb-6">
                Intuitive Visual Workflow Building
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Dafthunk empowers you to design, automate, and manage complex
                processes with an easy-to-use drag-and-drop interface. Connect
                various nodes, including powerful AI capabilities, to bring your
                automated workflows to life.
              </p>
              <ul className="space-y-4">
                {[
                  "Drag-and-drop nodes to build flows.",
                  "Configure each step with simple inputs.",
                  "Connect nodes to define data pathways.",
                  "Utilize AI for advanced processing.",
                  "Monitor executions in real-time.",
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-lg">
                    <CheckCircle className="h-6 w-6 text-primary mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="mt-10">
                <Link to="/workflows/playground">
                  Try the Playground <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <div className="order-1 lg:order-2 rounded-xl overflow-hidden shadow-2xl bg-background aspect-video flex items-center justify-center p-8 border">
              {/* Placeholder for a more dynamic visual if available */}
              <div className="w-full h-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center p-6">
                <Workflow className="h-24 w-24 text-primary/50 mb-6" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Visualize Your Automation
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Our interactive editor makes complex workflow creation simple
                  and efficient.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 md:py-28 bg-background border-t border-border">
        <div className="container mx-auto px-6 text-center">
          <span className="text-primary font-semibold uppercase tracking-wider text-sm">
            Powered By
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-2 mb-12">
            Built with Modern Technologies
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8 lg:gap-10 max-w-4xl mx-auto">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                <div className="p-4 bg-muted rounded-full border border-transparent hover:border-primary/30 transition-colors duration-200">
                  {tech.icon}
                </div>
                <span className="text-sm font-medium">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24 md:py-32 lg:py-40 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto text-center px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Ready to Automate?
          </h2>
          <p className="text-lg sm:text-xl md:text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
            Dive into the playground, explore our features, and start building
            your first automated workflow with Dafthunk today.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="bg-background text-primary hover:bg-background/90 shadow-lg"
          >
            <Link to="/workflows/playground">
              Start Building Now <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <HomeFooter />
    </>
  );
}
