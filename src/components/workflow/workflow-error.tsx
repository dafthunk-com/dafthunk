import { useRouteError } from "react-router-dom";

export function EditorError() {
  const error = useRouteError() as Error;

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-500 mb-4">Oops!</h1>
        <p className="text-lg text-gray-600 mb-4">
          Something went wrong while loading the workflow editor.
        </p>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    </div>
  );
}
