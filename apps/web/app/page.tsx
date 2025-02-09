import { Button } from "@repo/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6">
          Circuit
        </h1>
        <p className="text-lg text-gray-600">
          A modern workflow engine for building and managing complex processes.
        </p>
        <Button>
          Try it out
        </Button>
      </div>
    </main>
  );
}
