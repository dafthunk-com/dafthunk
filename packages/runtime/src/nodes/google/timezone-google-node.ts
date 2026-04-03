import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Google Time Zone node implementation
 * Retrieves timezone information for a location
 */
export class TimezoneGoogleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "timezone-google",
    name: "Time Zone (Google)",
    type: "timezone-google",
    description: "Get timezone information for a geographic location",
    tags: ["Google", "Maps", "Timezone", "Date"],
    icon: "clock",
    documentation:
      "This node retrieves timezone information for a given latitude/longitude using the Google Time Zone API. Returns the timezone ID, name, and UTC offsets including DST.",
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
        name: "timestamp",
        type: "number",
        description:
          "Unix timestamp (seconds) to determine DST. Defaults to current time.",
        required: false,
        hidden: true,
      },
      {
        name: "language",
        type: "string",
        description: "Language code (e.g., en, fr, de)",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "timeZoneId",
        type: "string",
        description: "IANA timezone ID (e.g., America/Los_Angeles)",
      },
      {
        name: "timeZoneName",
        type: "string",
        description: "Display name (e.g., Pacific Daylight Time)",
      },
      {
        name: "rawOffset",
        type: "number",
        description: "UTC offset in seconds (without DST)",
      },
      {
        name: "dstOffset",
        type: "number",
        description: "DST offset in seconds",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { latitude, longitude, timestamp, language } = context.inputs;
      const apiKey = context.env.GOOGLE_API_KEY;

      if (!apiKey) {
        return this.createErrorResult("GOOGLE_API_KEY is not configured");
      }

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return this.createErrorResult("Latitude and longitude are required");
      }

      const ts =
        timestamp && typeof timestamp === "number"
          ? timestamp
          : Math.floor(Date.now() / 1000);

      const url = new URL("https://maps.googleapis.com/maps/api/timezone/json");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("location", `${latitude},${longitude}`);
      url.searchParams.set("timestamp", ts.toString());

      if (language && typeof language === "string") {
        url.searchParams.set("language", language);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "User-Agent": "Dafthunk/1.0" },
      });

      if (!response.ok) {
        return this.createErrorResult(
          `Time Zone API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as {
        status: string;
        timeZoneId: string;
        timeZoneName: string;
        rawOffset: number;
        dstOffset: number;
      };

      if (data.status !== "OK") {
        return this.createErrorResult(`Time Zone API error: ${data.status}`);
      }

      return this.createSuccessResult({
        timeZoneId: data.timeZoneId,
        timeZoneName: data.timeZoneName,
        rawOffset: data.rawOffset,
        dstOffset: data.dstOffset,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error querying Time Zone API"
      );
    }
  }
}
