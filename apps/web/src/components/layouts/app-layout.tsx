import { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import * as Sidebar from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { NavMainProps } from "@/components/nav-main";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
  sidebar?: {
    title: string;
    items: NavMainProps["items"];
  };
}

const pageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.1,
      ease: "easeInOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
      ease: "easeInOut",
    },
  },
};

export function AppLayout({ children, sidebar }: AppLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {sidebar ? (
            <Sidebar.SidebarProvider key={`provider-${location.pathname}`}>
              <AppSidebar title={sidebar.title} items={sidebar.items} />
              <Sidebar.SidebarInset>
                <motion.div
                  key={`sidebar-content-${location.pathname}`}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="h-full w-full"
                >
                  {children}
                </motion.div>
              </Sidebar.SidebarInset>
            </Sidebar.SidebarProvider>
          ) : (
            <motion.div
              key={`no-sidebar-content-${location.pathname}`}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative flex w-full flex-1 flex-col border rounded-md mx-2 mb-2 bg-background overflow-auto"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
