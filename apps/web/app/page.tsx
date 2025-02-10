import { Button } from "@repo/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { StoredGraph } from "./api/graphs/store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getGraphs() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/graphs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch graphs: ${res.statusText}`);
    }

    const data = await res.json();
    return data.graphs as StoredGraph[];
  } catch (error) {
    console.error('Error fetching graphs:', error);
    return [];
  }
}

export default async function Home() {
  const graphs = await getGraphs();

  return (
    <main className="h-screen p-2">
      <div className="h-full rounded-xl border border-white overflow-hidden bg-gray-100">
        <div className="relative h-full p-6">
          {graphs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <p className="text-gray-500 text-lg">No graphs yet. Create your first one!</p>
              <Link href="/flow/new">
                <Button>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create New Graph
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {graphs.map((graph) => (
                <Link key={graph.id} href={`/flow/${graph.id}`}>
                  <div className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow cursor-pointer">
                    <h3 className="font-medium text-lg mb-2">{graph.name || 'Untitled Graph'}</h3>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(graph.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          <div className="absolute bottom-4 right-4">
            <Link href="/flow/new">
              <Button variant="default" size="icon">
                <PlusIcon className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
