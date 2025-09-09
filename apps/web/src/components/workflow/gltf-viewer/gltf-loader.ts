import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { LoadingManager } from "three";

// Custom hook for authenticated GLTF loading
export function useAuthenticatedGLTF(url: string) {
  const extendLoader = useMemo(() => {
    return (loader: any) => {
      console.log("Extending GLTFLoader for authenticated requests");

      // Set withCredentials to include cookies/auth headers
      if (loader.manager && loader.manager.itemStart) {
        // Create a custom loading manager that includes credentials
        const manager = new LoadingManager();

        // Override the manager's load method to add credentials
        const originalResolveURL = manager.resolveURL?.bind(manager);
        if (originalResolveURL) {
          manager.resolveURL = function (url: string) {
            return originalResolveURL(url);
          };
        }

        loader.manager = manager;
      }

      // If the loader has a setWithCredentials method, use it
      if (typeof loader.setWithCredentials === "function") {
        loader.setWithCredentials(true);
        console.log("Set withCredentials=true on GLTFLoader");
      }

      // If the loader supports request headers (some loaders do)
      if (typeof loader.setRequestHeader === "function") {
        // Add any additional headers if needed
        console.log("GLTFLoader supports setRequestHeader");
      }

      // Override the load method to ensure credentials
      const originalLoad = loader.load.bind(loader);
      loader.load = function (
        url: string,
        onLoad?: any,
        onProgress?: any,
        onError?: any
      ) {
        console.log("Loading glTF with authentication:", url);

        // Try to use fetch directly with credentials for better control
        fetch(url, {
          credentials: "include",
          method: "GET",
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }
            return response.arrayBuffer();
          })
          .then((buffer) => {
            // Create a blob URL for the Three.js loader to use
            const blob = new Blob([buffer], { type: "model/gltf-binary" });
            const blobUrl = URL.createObjectURL(blob);

            // Load using the blob URL (no auth needed)
            return originalLoad(
              blobUrl,
              (gltf: any) => {
                URL.revokeObjectURL(blobUrl); // Clean up
                if (onLoad) onLoad(gltf);
              },
              onProgress,
              onError
            );
          })
          .catch((error) => {
            console.error("Authenticated glTF fetch failed:", error);
            if (onError) onError(error);
          });
      };
    };
  }, []);

  return useGLTF(url, false, false, extendLoader);
}
