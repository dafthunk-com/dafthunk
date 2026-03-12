declare const RUNTIME_VERSION: string;

export const runtimeVersion =
  typeof RUNTIME_VERSION !== "undefined" ? RUNTIME_VERSION : "development";
