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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Circuit</h1>
            <p className="text-lg text-gray-600 mt-2">
              A modern workflow engine for building and managing complex processes.
            </p>
          </div>
          <Link href="/flow/new">
            <Button size="lg">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Graph
            </Button>
          </Link>
        </div>

        {graphs.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white">
            <p className="text-gray-600 mb-4">No graphs created yet</p>
            <Link href="/flow/new">
              <Button variant="secondary">Create your first graph</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {graphs.map((graph) => (
              <Link key={graph.id} href={`/flow/${graph.id}`}>
                <div className="p-6 border rounded-lg bg-white hover:shadow-lg transition-shadow">
                  <h2 className="text-xl font-semibold">{graph.name}</h2>
                  <p className="text-sm text-gray-500 mt-2">
                    Created {new Date(graph.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Last updated {new Date(graph.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
