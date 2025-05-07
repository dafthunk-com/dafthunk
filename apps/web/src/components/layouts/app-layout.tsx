import { ReactNode } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import * as Sidebar from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { NavMainProps } from "@/components/sidebar/nav-main";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { PageProvider } from "@/components/page-context";
import { Toaster } from "sonner";

interface AppLayoutProps {
  children: ReactNode;
  sidebar?: {
    title: string;
    items: NavMainProps["items"];
    footerItems?: NavMainProps["footerItems"];
  };
}

const pageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.2,
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
    <PageProvider>
      <div className="flex h-screen w-screen overflow-hidden flex-col">
        <AppHeader />
        <Toaster />
        <div className="flex flex-1 overflow-hidden">
          {sidebar ? (
            <Sidebar.SidebarProvider>
              <AppSidebar
                title={sidebar.title}
                items={sidebar.items}
                footerItems={sidebar.footerItems}
              />
              <Sidebar.SidebarInset>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`sidebar-content-${location.pathname}`}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="h-full w-full overflow-y-auto"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </Sidebar.SidebarInset>
            </Sidebar.SidebarProvider>
          ) : (
            <AnimatePresence mode="wait">
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
            </AnimatePresence>
          )}
        </div>
      </div>
    </PageProvider>
  );
}
