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

import { useAuth } from "@/components/auth-context";
import { HOME_HEADER_HEIGHT, HomeHeader } from "@/components/home-header";
import { HomeFooter } from "@/components/layouts/home-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/utils";

function BackgroundBubble({
  variant,
  className,
  size = 600,
}: {
  variant: "indigo" | "sky" | "background";
  className?: string;
  size?: number;
}) {
  let color = "";
  switch (variant) {
    case "indigo":
      color = "bg-indigo-500/30";
      break;
    case "sky":
      color = "bg-sky-500/40";
      break;
    case "background":
      color = "bg-neutral-100 dark:bg-neutral-900";
      break;
  }

  return (
    <div
      className={cn("absolute rounded-full -z-10", color, className)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        filter: "blur(100px)",
      }}
    />
  );
}

export function HomePage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const features = [
    {
      icon: (
        <Workflow className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
      ),
      title: "Visual Workflow Editor",
      description:
        "Intuitive drag-and-drop interface to build and manage complex automation flows.",
    },
    {
      icon: <Cpu className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />,
      title: "AI-Powered Nodes",
      description:
        "Leverage Cloudflare AI for text summarization, image analysis, and more, directly in your workflows.",
    },
    {
      icon: <Share2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />,
      title: "Serverless Execution",
      description:
        "Run workflows efficiently on Cloudflare's global edge network without managing servers.",
    },
    {
      icon: (
        <PlayCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
      ),
      title: "Real-time Monitoring",
      description:
        "Observe workflow executions and results as they happen, ensuring transparency and control.",
    },
    {
      icon: (
        <Database className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
      ),
      title: "Persistent Storage",
      description:
        "Securely save and retrieve your workflows using Cloudflare D1 database integration.",
    },
    {
      icon: <Rocket className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />,
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
    <div className="overflow-x-hidden">
      <HomeHeader />

      <main>
        {/* Hero Section */}
        <section
          className="mx-auto relative pt-24 pb-10 bg-gradient-to-b from-transparent to-neutral-50 dark:to-neutral-900"
          style={{
            marginTop: `${HOME_HEADER_HEIGHT}px`,
          }}
        >
          <BackgroundBubble
            variant="indigo"
            className="top-[-100px] left-[-100px]"
          />
          <BackgroundBubble
            variant="sky"
            className="top-[-250px] left-[350px]"
          />
          <div className="container mx-auto w-full flex flex-col items-center justify-center text-center px-6">
            <div className="text-4xl xs:text-5xl sm:text-5xl md:text-6xl lg:text-7xl max-w-3xl mx-auto font-bold tracking-tight mb-4 sm:mb-6 relative">
              <h1 className="relative">
                <span className="bg-gradient-to-r from-indigo-600 to-purple-700 dark:from-indigo-500 dark:to-purple-400 bg-clip-text text-transparent">
                  Build
                </span>{" "}
                and{" "}
                <span className="bg-gradient-to-r from-purple-700 to-indigo-600 dark:from-purple-400 dark:to-indigo-500 bg-clip-text text-transparent">
                  automate
                </span>
                <div className="absolute -z-10 top-0 left-0 w-[150vw] -translate-x-1/3 border-t-2 border-dashed border-neutral-100 dark:border-neutral-500 opacity-75"></div>
                <div className="absolute -z-10 -bottom-1 left-0 w-[150vw] -translate-x-1/3 border-t-2 border-dashed border-neutral-100 dark:border-neutral-500 opacity-75"></div>
                <div className="absolute -z-10 top-0 left-3 h-screen -translate-y-1/2 border-l-2 border-dashed border-neutral-100 dark:border-neutral-500 opacity-75"></div>
              </h1>
              <h1>workflows with ease.</h1>
              <div className="absolute top-0 left-0 scale-125 w-full h-full bg-white/75 dark:bg-black/75 -z-10 blur-3xl"></div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-6 sm:mb-10 max-w-3xl mx-auto">
              A powerful, visual workflows with ease, powered by serverless &
              AI.
            </p>
            <div className="flex flex-row justify-center w-full items-center gap-2 sm:gap-4 mb-6 sm:mb-10">
              <Button
                asChild
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white"
              >
                <Link to="/workflows/playground">
                  Start Building <ArrowRight className="ms-1 size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/docs">Explore Docs</Link>
              </Button>
            </div>
            <div className="w-full aspect-video rounded-lg border bg-white dark:bg-neutral-900 grid place-items-center text-muted-foreground">
              video demo placeholder
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="py-20 md:py-28 dark:bg-neutral-800/50 border-t"
        >
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider text-sm">
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
                <Card key={feature.title} className="bg-card border">
                  <CardHeader className="flex flex-row items-center gap-4 p-6">
                    <div className="mt-2">{feature.icon}</div>
                    <CardTitle className="text-xl font-semibold">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 md:py-28 dark:bg-neutral-800/50 relative">
          <BackgroundBubble
            variant="indigo"
            className="top-[-200px] right-[-100px] opacity-50"
            size={700}
          />
          <BackgroundBubble
            variant="sky"
            className="top-[200px] right-[-200px] opacity-50"
            size={500}
          />
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-center">
              <div className="order-2 lg:order-1">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider text-sm">
                  Streamlined Process
                </span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-2 mb-6">
                  Intuitive Visual Workflow Building
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Dafthunk empowers you to design, automate, and manage complex
                  processes with an easy-to-use drag-and-drop interface. Connect
                  various nodes, including powerful AI capabilities, to bring
                  your automated workflows to life.
                </p>
                <ul className="space-y-4">
                  {[
                    "Drag-and-drop nodes to build flows.",
                    "Connect nodes to define data pathways.",
                    "Utilize AI for advanced processing.",
                  ].map((item, index) => (
                    <li key={index} className="flex items-center text-lg">
                      <CheckCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0" />
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
              <div className="order-1 lg:order-2 rounded-xl overflow-hidden bg-background flex items-center justify-center p-8 border">
                {/* Placeholder for a more dynamic visual if available */}
                <div className="w-full h-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center p-6">
                  <Workflow className="h-24 w-24 text-indigo-600 dark:text-indigo-400 mb-6" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Visualize Your Automation
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Our interactive editor makes complex workflow creation
                    simple and efficient.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="py-20 md:py-28 bg-white dark:bg-black border-y">
          <div className="container mx-auto px-6 text-center">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider text-sm">
              Powered By
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-2 mb-12">
              Built with Modern Technologies
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8 lg:gap-10 max-w-4xl mx-auto">
              {techStack.map((tech) => (
                <div
                  key={tech.name}
                  className="group flex flex-col items-center gap-2 text-muted-foreground transition-colors"
                >
                  <div className="p-4 bg-muted rounded-full border-2 border-transparent group-hover:border-indigo-600 dark:group-hover:border-indigo-400 transition-colors">
                    <div className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {tech.icon}
                    </div>
                  </div>
                  <span className="text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {tech.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="relative py-16 md:py-24 lg:py-32">
          {/* Blurred balls background */}
          <BackgroundBubble
            variant="indigo"
            className="top-[-100px] left-[-100px]"
            size={600}
          />
          <BackgroundBubble
            variant="sky"
            className="top-[-150px] right-[-150px]"
            size={500}
          />
          <BackgroundBubble
            variant="background"
            className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            size={600}
          />
          <div className="container mx-auto text-center px-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Ready to Automate?
            </h2>
            <p className="text-lg sm:text-xl md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Dive into the playground, explore our features, and start building
              your first automated workflow with Dafthunk today.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white"
            >
              <Link to="/workflows/playground">
                Start Building Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
