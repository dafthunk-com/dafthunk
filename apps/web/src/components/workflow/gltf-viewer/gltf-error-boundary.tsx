import { Component, type ErrorInfo, type ReactNode } from "react";

interface GltfViewerErrorBoundaryProps {
  children: ReactNode;
  onError: (error: Error, errorInfo: ErrorInfo) => void;
}

interface GltfViewerErrorBoundaryState {
  hasError: boolean;
}

export class GltfViewerErrorBoundary extends Component<
  GltfViewerErrorBoundaryProps,
  GltfViewerErrorBoundaryState
> {
  constructor(props: GltfViewerErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GltfViewerErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("=== Enhanced 3D Error Boundary ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Component stack:", errorInfo.componentStack);
    console.error("Error name:", error.name);
    console.error("Full error object:", error);
    console.error("Full errorInfo object:", errorInfo);

    // Check for specific Three.js/glTF related errors
    const isThreeJSError =
      error.message.includes("THREE") ||
      error.message.includes("glTF") ||
      error.message.includes("GLTFLoader") ||
      error.stack?.includes("three");
    console.error("Is Three.js related error:", isThreeJSError);

    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-full h-full bg-red-50 dark:bg-red-900 rounded border border-red-200 dark:border-red-800">
          <div className="flex flex-col items-center space-y-2 text-center p-4">
            <div className="w-8 h-8 text-red-500 dark:text-red-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <span className="text-sm text-red-600 dark:text-red-400">
              3D Rendering Error
            </span>
            <span className="text-xs text-red-500 dark:text-red-300">
              WebGL may not be supported in your browser
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
