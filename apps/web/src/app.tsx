import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useMatches,
} from "react-router";

import { HeadSeo } from "@/components/head-seo";
import { ThemeProvider } from "@/components/theme-provider";

import { AuthProvider } from "./components/auth-context";
import { Button } from "./components/ui/button";
import { RouteHandle } from "./routes";

export function FallbackErrorUI() {
  return (
    <main className="h-screen w-screen flex items-center justify-center">
      <div className="relative h-full p-6 overflow-auto">
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-2xl font-bold">Unexpected Error</h1>
          <p className="text-neutral-500 text-lg mt-2 mb-6">
            Something went wrong. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    </main>
  );
}

function CurrentRouteHead() {
  const matches = useMatches();
  const location = useLocation();
  const lastMatch = matches[matches.length - 1];
  const handle = lastMatch?.handle as RouteHandle | undefined;

  if (handle?.head) {
    if (typeof handle.head === "function") {
      return handle.head(lastMatch.params, {
        url: new URL(location.pathname, window.location.origin),
        location,
      });
    }
    return handle.head as React.ReactElement;
  }
  return <HeadSeo title="Dafthunk" />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <CurrentRouteHead />
        <Outlet />
        <ScrollRestoration />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
