import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  Cpu,
  GitFork,
  PlayCircle,
  Rocket,
  Share2,
  Workflow,
} from "lucide-react";
import { Link } from "react-router";

import { AppLayout } from "@/components/layouts/app-layout";
import { HomeFooter } from "@/components/layouts/home-footer";

export function HomePage() {
  const features = [
    {
      icon: <Workflow className="h-10 w-10 text-primary mb-4" />,
      title: "Visual Workflow Editor",
      description:
        "A drag-and-drop interface for creating and editing workflows that makes command-line enthusiasts mildly uncomfortable.",
    },
    {
      icon: <Cpu className="h-10 w-10 text-primary mb-4" />,
      title: "AI-Powered Nodes",
      description:
        "Leverage Cloudflare AI for text summarization, sentiment analysis, translation, and image classification. We've joined the AI bandwagon and we're not even sorry about it.",
    },
    {
      icon: <Share2 className="h-10 w-10 text-primary mb-4" />,
      title: "Serverless Execution",
      description:
        "Run workflows on Cloudflare's global edge network, where servers are merely a philosophical concept.",
    },
    {
      icon: <PlayCircle className="h-10 w-10 text-primary mb-4" />,
      title: "Real-time Execution",
      description:
        "Watch your workflow results appear in real-time, for better or worse.",
    },
    {
      icon: <GitFork className="h-10 w-10 text-primary mb-4" />,
      title: "Persistent Storage",
      description:
        "Save and load workflows from Cloudflare D1 database with reasonable confidence that they'll still be there tomorrow.",
    },
    {
      icon: <Rocket className="h-10 w-10 text-primary mb-4" />,
      title: "Modern UI",
      description:
        "Crafted with React, TailwindCSS, and Shadcn UI components because life's too short for vanilla CSS.",
    },
  ];

  const techStack = [
    "React",
    "TypeScript",
    "TailwindCSS",
    "Shadcn UI",
    "React Flow",
    "React Router",
    "Vite",
    "Cloudflare D1",
    "Cloudflare Workers",
    "Cloudflare AI",
  ];

  return (
    <AppLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-neutral-50 dark:from-neutral-900 dark:to-neutral-800 py-20 md:py-32">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Welcome to Dafthunk!
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            Break it, fix it, prompt it, automatic, automatic, ...
            <br />A powerful, visual workflow automation platform.
          </p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link to="/workflows/playground">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/docs">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16">
            Why Choose Dafthunk?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="text-center transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="flex justify-center items-center">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section (Simplified) */}
      <section className="py-16 md:py-24 bg-neutral-50 dark:bg-neutral-800">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Intuitive Visual Workflow Building
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Dafthunk empowers you to design, automate, and manage complex
                processes with an easy-to-use drag-and-drop interface. Connect
                various nodes, including powerful AI capabilities, to bring your
                automated workflows to life.
              </p>
              <ul className="space-y-3">
                {[
                  "Drag-and-drop nodes to build flows.",
                  "Configure each step with simple inputs.",
                  "Connect nodes to define data pathways.",
                  "Utilize AI for advanced processing.",
                  "Monitor executions in real-time.",
                ].map((item) => (
                  <li key={item} className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg overflow-hidden shadow-xl bg-muted/50 dark:bg-muted/20 aspect-video flex items-center justify-center p-6 border border-border">
              <div className="w-full h-full border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center text-center">
                <Workflow className="h-20 w-20 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground/80 px-4">
                  Visualize and build your automation flows with an intuitive
                  drag-and-drop interface.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">
            Built with Modern Technologies
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((tech) => (
              <div
                key={tech}
                className="bg-muted text-muted-foreground px-4 py-2 rounded-md text-sm font-medium"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Automate?
          </h2>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Dive into the playground, explore our features, and start building
            your first automated workflow with Dafthunk today.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/workflows/playground">Start Building Now</Link>
          </Button>
        </div>
      </section>

      <HomeFooter />
    </AppLayout>
  );
}
