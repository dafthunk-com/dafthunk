import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Google Weather node implementation
 * Retrieves current weather conditions for a location
 */
export class WeatherGoogleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "weather-google",
    name: "Weather (Google)",
    type: "weather-google",
    description: "Get current weather conditions for a location",
    tags: ["Google", "Weather", "Environment"],
    icon: "cloud",
    documentation:
      "This node retrieves current weather conditions for a given latitude/longitude using the Google Weather API. Returns temperature, humidity, wind, precipitation, and more.",
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "latitude",
        type: "number",
        description: "Latitude of the location",
        required: true,
      },
      {
        name: "longitude",
        type: "number",
        description: "Longitude of the location",
        required: true,
      },
      {
        name: "languageCode",
        type: "string",
        description: "Language code (e.g., en, fr, de). Defaults to en.",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "temperature",
        type: "number",
        description: "Temperature in Celsius",
      },
      {
        name: "feelsLike",
        type: "number",
        description: "Feels-like temperature in Celsius",
      },
      {
        name: "humidity",
        type: "number",
        description: "Humidity percentage",
      },
      {
        name: "description",
        type: "string",
        description: "Weather condition description",
      },
      {
        name: "windSpeed",
        type: "number",
        description: "Wind speed in km/h",
      },
      {
        name: "uvIndex",
        type: "number",
        description: "UV index",
      },
      {
        name: "conditions",
        type: "json",
        description: "Full weather conditions object",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { latitude, longitude, languageCode } = context.inputs;
      const apiKey = context.env.GOOGLE_API_KEY;

      if (!apiKey) {
        return this.createErrorResult("GOOGLE_API_KEY is not configured");
      }

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return this.createErrorResult("Latitude and longitude are required");
      }

      const url = new URL(
        "https://weather.googleapis.com/v1/currentConditions:lookup"
      );
      url.searchParams.set("key", apiKey);
      url.searchParams.set("location.latitude", latitude.toString());
      url.searchParams.set("location.longitude", longitude.toString());

      if (languageCode && typeof languageCode === "string") {
        url.searchParams.set("languageCode", languageCode);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "User-Agent": "Dafthunk/1.0" },
      });

      if (!response.ok) {
        return this.createErrorResult(
          `Weather API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as {
        temperature?: { degrees: number };
        feelsLikeTemperature?: { degrees: number };
        humidity?: { percent: number };
        weatherCondition?: {
          description?: { text: string };
          type?: string;
        };
        wind?: { speed?: { value: number } };
        uvIndex?: number;
      };

      return this.createSuccessResult({
        temperature: data.temperature?.degrees ?? null,
        feelsLike: data.feelsLikeTemperature?.degrees ?? null,
        humidity: data.humidity?.percent ?? null,
        description: data.weatherCondition?.description?.text ?? "",
        windSpeed: data.wind?.speed?.value ?? null,
        uvIndex: data.uvIndex ?? null,
        conditions: data,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error querying Weather API"
      );
    }
  }
}
