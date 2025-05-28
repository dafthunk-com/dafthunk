import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Cpu,
  Database,
  Github,
  PlayCircle,
  Rocket,
  Share2,
  Workflow,
} from "lucide-react";
import { Link, Navigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { HomeFooter } from "@/components/layouts/home-footer";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const features = [
    {
      icon: <Workflow className="h-8 w-8 text-rose-600 dark:text-rose-400" />,
      title: "Visual Workflow Editor",
      description:
        "A drag-and-drop interface so easy, even your cat could automate your chores. (Results may vary.)",
    },
    {
      icon: <Cpu className="h-8 w-8 text-rose-600 dark:text-rose-400" />,
      title: "AI-Powered Nodes",
      description:
        "Jump on the AI bandwagon: text summarization, image analysis, and more, all without reading a single research paper.",
    },
    {
      icon: <Share2 className="h-8 w-8 text-rose-600 dark:text-rose-400" />,
      title: "Serverless Execution",
      description:
        "Run workflows on Cloudflare's edge, where servers are just a rumor. Deploy, forget, and hope for the best.",
    },
    {
      icon: <PlayCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />,
      title: "Real-time Monitoring",
      description:
        "Watch your workflows succeed, fail, or do something in between—all in real time, for your viewing pleasure.",
    },
    {
      icon: <Database className="h-8 w-8 text-rose-600 dark:text-rose-400" />,
      title: "Persistent Storage",
      description:
        "Store your workflows with Cloudflare D1. Because sometimes, you actually want your data to stick around.",
    },
    {
      icon: <Rocket className="h-8 w-8 text-rose-600 dark:text-rose-400" />,
      title: "Modern & Performant",
      description:
        "Built with all the latest buzzwords: React, TailwindCSS, and Shadcn UI. Fast, beautiful, and probably over-engineered.",
    },
  ];

  return (
    <div className="overflow-x-hidden">
      {/* <HomeHeader /> */}

      <main>
        {/* Hero Section */}
        <section className="mx-auto relative pt-16 pb-10">
          <div className="container max-w-5xl px-6 mx-auto flex flex-col items-center">
            <img
              src="/logo.svg"
              alt="dafthunk"
              className="h-12 sm:h-16 dark:invert mb-6"
            />
            <div className="max-w-prose mx-auto">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 relative text-center">
                <h1 className="relative">
                  <span className="bg-gradient-to-r from-rose-600 to-purple-700 dark:from-rose-500 dark:to-purple-400 bg-clip-text text-transparent">
                    Workflows
                  </span>{" "}
                  no one asked for.
                </h1>
              </div>
              <p className="text-lg sm:text-xl text-muted-foreground mb-6 text-center">
                Automate the boring stuff, then automate the fun stuff, then
                automate automating.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center w-full items-center gap-2 sm:gap-3 mb-10">
              <Button
                asChild
                size="default"
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium w-full sm:w-auto"
              >
                <Link to="/workflows/playground">
                  Break it <ArrowUp className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="default"
                className="bg-gradient-to-b sm:bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 dark:bg-gradient-to-r dark:from-indigo-500 dark:to-rose-500 dark:hover:from-indigo-600 dark:hover:to-rose-600 text-white font-medium w-full sm:w-auto"
              >
                <Link to="/workflows/playground">
                  Fix it <ArrowDown className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="default"
                className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white font-medium w-full sm:w-auto"
              >
                <Link to="/workflows/playground">
                  Prompt it <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="border-4 border-white dark:border-neutral-800 ring-1 ring-border w-full aspect-video overflow-hidden rounded-lg shadow-sm grid place-items-center">
              <iframe
                src={`https://www.dafthunk.com/public/executions/97e0f901-2d8c-46e7-b95a-437ca42eba15?fullscreen&theme=${theme}`}
                className="w-full h-full"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-20">
          <div className="container px-6 max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wider text-xs">
                Stuff It Does (Because Apparently, It Needed To)
              </span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight mt-1">
                All This. Really.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="h-full">
                  <CardHeader className="flex flex-row items-start gap-3 p-5">
                    <div className="mt-1 text-rose-600 dark:text-rose-400">
                      {feature.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {feature.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-6 text-center max-w-4xl">
            <span className="text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wider text-xs">
              Crafted in Public (So You Can Witness the Chaos)
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight mt-1 mb-2">
              Built with Open Source Technologies
            </h2>
            <p className="text-muted-foreground mb-6">
              Join the community and help us build the future of workflows.
            </p>
            <Button
              asChild
              size="default"
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium"
            >
              <Link to="https://github.com/dafthunk-com/dafthunk">
                Contribute to the Project <Github className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="relative py-16 md:py-20">
          {/* Blurred balls background */}
          <div className="container mx-auto text-center px-6 max-w-prose">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-rose-600 dark:text-rose-400">
              Alright, Enough Procrastinating
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-6">
              Start solving imaginary problems, and break the playground.
            </p>
            <Button
              asChild
              size="default"
              className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white font-medium"
            >
              <Link to="/workflows/playground">
                Start Building Now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
