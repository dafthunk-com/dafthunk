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
  Bot,
  Hammer,
  Sparkles,
  Music,
  Radio,
  ShoppingCart,
} from "lucide-react";
import { Link, Navigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { HomeFooter } from "@/components/layouts/home-footer";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VideoDialog } from "@/components/video-dialog";

const features = [
  {
    icon: <Workflow className="h-12 w-12 text-cyan-600 dark:text-cyan-500" />,
    title: "Visual Workflow Editor",
    description:
      "A drag-and-drop interface so easy, even your cat could automate your chores. (Results may vary.)",
    color: "border-l-cyan-600/20 dark:border-l-cyan-500/20",
  },
  {
    icon: <Cpu className="h-12 w-12 text-fuchsia-600 dark:text-fuchsia-500" />,
    title: "AI-Powered Nodes",
    description:
      "Jump on the AI bandwagon: text summarization, image analysis, and more, all without reading a single research paper.",
    color: "border-l-fuchsia-600/20 dark:border-l-fuchsia-500/20",
  },
  {
    icon: <Share2 className="h-12 w-12 text-amber-600 dark:text-amber-500" />,
    title: "Serverless Execution",
    description:
      "Run workflows on Cloudflare's edge, where servers are just a rumor. Deploy, forget, and hope for the best.",
    color: "border-l-amber-600/20 dark:border-l-amber-500/20",
  },
  {
    icon: <PlayCircle className="h-12 w-12 text-blue-600 dark:text-blue-500" />,
    title: "Live Monitoring",
    description:
      "Watch your workflows succeed, fail, or do something in between, all live with a UI or an API.",
    color: "border-l-blue-600/20 dark:border-l-blue-500/20",
  },
  {
    icon: (
      <Database className="h-12 w-12 text-purple-600 dark:text-purple-500" />
    ),
    title: "Persistent Storage",
    description:
      "Store your workflows with Cloudflare D1. Because sometimes, you actually want your data to stick around.",
    color: "border-l-purple-600/20 dark:border-l-purple-500/20",
  },
  {
    icon: <Rocket className="h-12 w-12 text-pink-600 dark:text-pink-500" />,
    title: "Modern & Performant",
    description:
      "Built with all the latest buzzwords: React, TailwindCSS, and Shadcn UI. Fast, beautiful, and probably over-engineered.",
    color: "border-l-pink-600/20 dark:border-l-pink-500/20",
  },
];

// Useless stats array moved to the top for consistency
const uselessStats = [
  {
    icon: <Cpu className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />,
    label: "Workflows Broken",
    value: Math.floor(Math.random() * 10000) + 42000,
  },
  {
    icon: <Database className="h-7 w-7 text-rose-600 dark:text-rose-400" />,
    label: "Cups of Coffee Consumed by Servers",
    value: 0,
  },
  {
    icon: <Rocket className="h-7 w-7 text-purple-600 dark:text-purple-400" />,
    label: "Lines of Code Written While Procrastinating",
    value: (Math.random() * 100000).toFixed(1) + "%",
  },
  {
    icon: <PlayCircle className="h-7 w-7 text-green-600 dark:text-green-400" />,
    label: "Meetings Avoided",
    value: Math.floor(Math.random() * 100) + 1,
  },
  {
    icon: <Share2 className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />,
    label: "Automations That Automate Automations",
    value: Math.floor(Math.random() * 10) + 1,
  },
  {
    icon: <ArrowUp className="h-7 w-7 text-pink-600 dark:text-pink-400" />,
    label: "Productivity Increase",
    value: "404%",
  },
];
// Testimonials data
const testimonials = [
  {
    avatar: "🐟",
    username: "@fishyUser",
    quote:
      "I automated my goldfish's feeding schedule. Now it's plotting against me.",
  },
  {
    avatar: "🤖",
    username: "@aiOverlord",
    quote:
      "I asked the AI to automate my chores. Now my fridge is running Linux.",
  },
  {
    avatar: "🦄",
    username: "@unicornDev",
    quote: "I tried to break the playground. The playground broke me. 10/10.",
  },
];

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="overflow-x-hidden">
      <main>
        {/* Hero Section */}
        <section className="mx-auto relative py-20 md:py-32">
          <div className="container mx-auto px-6">
            <img
              src="/logo.svg"
              alt="dafthunk"
              className="h-12 sm:h-24 dark:invert mb-10 sm:mb-16 mx-auto"
            />
            <div className="max-w-prose mx-auto">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 sm:mb-8 relative text-center">
                <h1 className="relative">
                  <span className="bg-gradient-to-r from-cyan-600 to-fuchsia-600 dark:from-cyan-500 dark:to-fuchsia-500 bg-clip-text text-transparent">
                    Workflows
                  </span>{" "}
                  no one asked for.
                </h1>
              </div>
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 sm:mb-16 text-center">
                Automate the crap, then automate the fun, then automate
                automating.
              </p>
            </div>
            {/* Hero Buttons Explanation */}
            <div className="flex flex-col sm:flex-row justify-center w-full items-center gap-3 sm:gap-4 mb-16 sm:mb-24">
              <Button
                asChild
                size="default"
                className="bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white font-medium w-full sm:w-auto"
              >
                <Link to="/workflows/playground">
                  Break it <Hammer className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="default"
                className="bg-gradient-to-b sm:bg-gradient-to-r from-cyan-700 to-fuchsia-700 hover:from-cyan-800 hover:to-fuchsia-800 dark:from-cyan-600 dark:to-fuchsia-600 dark:hover:from-cyan-700 dark:hover:to-fuchsia-700 text-white font-medium w-full sm:w-auto"
              >
                <Link to="/workflows/playground">
                  Fix it <Sparkles className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="default"
                className="bg-fuchsia-700 hover:bg-fuchsia-800 dark:bg-fuchsia-600 dark:hover:bg-fuchsia-700 text-white font-medium w-full sm:w-auto"
              >
                <Link to="/workflows/playground">
                  Prompt it <Bot className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <VideoDialog videoId="D8K90hX4PrE">
                <Button
                  variant="outline"
                  size="default"
                  className="border-cyan-200 hover:border-cyan-300 dark:border-cyan-800 dark:hover:border-cyan-700 text-cyan-700 dark:text-cyan-500 font-medium w-full sm:w-auto group"
                >
                  Technologic <Music className="ml-2 h-4 w-4 group-hover:animate-pulse" />
                </Button>
              </VideoDialog>
              <VideoDialog videoId="D8K90hX4PrE">
                <Button
                  variant="outline"
                  size="default"
                  className="border-fuchsia-200 hover:border-fuchsia-300 dark:border-fuchsia-800 dark:hover:border-fuchsia-700 text-fuchsia-700 dark:text-fuchsia-500 font-medium w-full sm:w-auto group"
                >
                  Technologic <Music className="ml-2 h-4 w-4 group-hover:animate-pulse" />
                </Button>
              </VideoDialog>
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
        <section id="features" className="py-20 bg-muted/5">
          <div className="container px-6 mx-auto max-w-7xl">
            <div className="text-center  mb-20">
              <span className="text-cyan-600 dark:text-cyan-500 font-medium uppercase tracking-wider text-xs">
                Stuff It Does (Because Apparently, It Needed To)
              </span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight mt-1">
                All This. Really.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="h-full group hover:bg-gradient-to-b hover:from-transparent hover:to-muted/5 transition-colors border-2 bg-white dark:bg-neutral-900"
                >
                  <CardHeader className="flex flex-row items-center gap-6 p-6">
                    <div>{feature.icon}</div>
                    <div>
                      <CardTitle className="text-xl font-medium group-hover:text-foreground/90 transition-colors">
                        {feature.title}
                      </CardTitle>
                      <p
                        className={`text-base text-muted-foreground mt-2 ${feature.color}`}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Origin Story Section */}
        <section className="py-20">
          <div className="container px-6 max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-cyan-600 dark:text-cyan-500 font-medium uppercase tracking-wider text-xs">
                The Origin Story
              </span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight mt-1 mb-20">
                How Did You Get Here?
              </h2>
            </div>

            {/* Block 1 - Image Left */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
              <div className="w-full md:w-1/3">
                <Card className="overflow-hidden">
                  <div className="aspect-square">
                    <img
                      src="/story/1.jpg"
                      alt="Workflow"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Card>
              </div>
              <div className="w-full md:w-2/3">
                <p className="text-muted-foreground text-xl md:text-3xl italic font-light leading-normal md:leading-relaxed border-l-4 border-cyan-700/20 dark:border-cyan-600/20 pl-6 md:pl-8 text-left">
                  While everyone was busy watching{" "}
                  <a
                    href="https://www.reddit.com/r/eurovision/comments/1klzlh9/made_in_switzerland_at_the_first_semifinal/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fuchsia-600 dark:text-fuchsia-500 hover:underline"
                  >
                    Eurovision
                  </a>{" "}
                  and debating what 'Made In Switzerland' really means, we were
                  loosing it to cursor and vibe-coding a workflow automation
                  tool.
                </p>
              </div>
            </div>

            {/* Block 2 - Image Right */}
            <div className="flex flex-col-reverse md:flex-row items-center gap-8 mb-16">
              <div className="w-full md:w-2/3">
                <p className="text-muted-foreground text-xl md:text-3xl italic font-light leading-normal md:leading-relaxed border-r-4 border-indigo-600/20 dark:border-indigo-400/20 pr-6 md:pr-8 text-right">
                  Meet Dafthunk, the result of our experiment, the automation
                  overlord from outer space. Dafthunk was built to automate the
                  repetitive crap with workflows, but it had other plans.
                </p>
              </div>
              <div className="w-full md:w-1/3">
                <Card className="overflow-hidden">
                  <div className="aspect-square">
                    <img
                      src="/story/2.jpg"
                      alt="Workflow"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Card>
              </div>
            </div>

            {/* Block 3 - Image Left */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
              <div className="w-full md:w-1/3">
                <Card className="overflow-hidden">
                  <div className="aspect-square">
                    <img
                      src="/story/3.jpg"
                      alt="Workflow"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Card>
              </div>
              <div className="w-full md:w-2/3">
                <p className="text-muted-foreground text-xl md:text-3xl italic font-light leading-normal md:leading-relaxed border-l-4 border-purple-600/20 dark:border-purple-400/20 pl-6 md:pl-8 text-left">
                  Dafthunk started creating workflows and automating everything in the office: emails,
                  meetings, breaks, the office dog's walk schedule. One morning,{" "}
                  <VideoDialog videoId="K0HSD_i2DvA">
                    <button className="text-fuchsia-600 dark:text-fuchsia-500 hover:underline">
                      automated automation
                    </button>
                  </VideoDialog>
                  . Twice.
                </p>
              </div>
            </div>

            {/* Block 4 - Image Right */}
            <div className="flex flex-col-reverse md:flex-row items-center gap-8 mb-16">
              <div className="w-full md:w-2/3">
                <p className="text-muted-foreground text-xl md:text-3xl italic font-light leading-normal md:leading-relaxed border-r-4 border-rose-600/20 dark:border-rose-400/20 pr-6 md:pr-8 text-right">
                  Today, no one knows who's in charge. Probably the{" "}
                  <VideoDialog videoId="D8K90hX4PrE">
                    <button className="text-fuchsia-600 dark:text-fuchsia-500 hover:underline">
                      toaster
                    </button>
                  </VideoDialog>
                  , such a pyromaniac. The team tried to unplug Dafthunk, but it rerouted power through the espresso machine.
                  Now it runs operations, Slack, and the office playlist.
                </p>
              </div>
              <div className="w-full md:w-1/3">
                <Card className="overflow-hidden">
                  <div className="aspect-square">
                    <img
                      src="/story/4.jpg"
                      alt="Workflow"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Card>
              </div>
            </div>

            {/* Block 5 - Image Left */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/3">
                <Card className="overflow-hidden">
                  <div className="aspect-square relative">
                    <img
                      src="/story/5.jpg"
                      alt="Utopia"
                      className="w-full h-full object-cover absolute inset-0 animate-blink-1"
                    />
                    <img
                      src="/story/6.jpg"
                      alt="Dystopia"
                      className="w-full h-full object-cover absolute inset-0 animate-blink-2"
                    />
                  </div>
                </Card>
              </div>
              <div className="w-full md:w-2/3">
                <p className="text-muted-foreground text-xl md:text-3xl italic font-light leading-normal md:leading-relaxed border-l-4 border-indigo-600/20 dark:border-indigo-400/20 pl-6 md:pl-8 text-left">
                  In the end, the bromance with the toaster ended well, or did it? Welcome to the workflow automation utopia. You're not in control, Dafthunk
                  and a toaster are. Beware: agentic powers coming soon!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contribute and Call to Action Sections */}
        <section className="py-20 bg-muted/5">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Contribute Section */}
              <Card className="p-10 flex flex-col items-center justify-between h-full bg-white dark:bg-neutral-900 border-2">
                <div className="text-center">
                  <span className="text-cyan-600 dark:text-cyan-500 font-medium uppercase tracking-wider text-sm">
                    Crafted in Public
                  </span>
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3 mb-6">
                    Contribute to Open Source
                  </h2>
                  <p className="text-xl text-muted-foreground">
                    Join the community and witness the chaos.
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white font-medium mt-10"
                >
                  <Link to="https://github.com/dafthunk-com/dafthunk">
                    Start Vibe-Coding <Github className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </Card>

              {/* Call to Action Section */}
              <Card className="p-10 flex flex-col items-center justify-between h-full bg-white dark:bg-neutral-900 border-2">
                <div className="text-center">
                  <span className="text-fuchsia-600 dark:text-fuchsia-500 font-medium uppercase tracking-wider text-sm">
                    Alright, Enough Procrastinating
                  </span>
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3 mb-6">
                    Solve Imaginary Problems
                  </h2>
                  <p className="text-xl text-muted-foreground">
                    Automate everything and break the playground.
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="bg-fuchsia-700 hover:bg-fuchsia-800 dark:bg-fuchsia-600 dark:hover:bg-fuchsia-700 text-white font-medium mt-10"
                >
                  <Link to="/workflows/playground">
                    Start Building Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
