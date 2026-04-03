import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Google Geocoding node implementation
 * Converts addresses to coordinates and vice versa
 */
export class GeocodingGoogleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geocoding-google",
    name: "Geocoding (Google)",
    type: "geocoding-google",
    description: "Convert addresses to coordinates or coordinates to addresses",
    tags: ["Google", "Maps", "Geocoding", "Geo"],
    icon: "map-pin",
    documentation:
      "This node geocodes an address to coordinates, or reverse-geocodes coordinates to an address using the Google Geocoding API. Provide either an address for forward geocoding, or latitude/longitude for reverse geocoding.",
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "address",
        type: "string",
        description:
          "Address to geocode (e.g., '1600 Amphitheatre Parkway, Mountain View, CA')",
        required: false,
      },
      {
        name: "latitude",
        type: "number",
        description: "Latitude for reverse geocoding",
        required: false,
      },
      {
        name: "longitude",
        type: "number",
        description: "Longitude for reverse geocoding",
        required: false,
      },
      {
        name: "language",
        type: "string",
        description: "Language code (e.g., en, fr, de)",
        required: false,
        hidden: true,
      },
      {
        name: "region",
        type: "string",
        description: "Region bias as ccTLD (e.g., us, gb, fr)",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "formattedAddress",
        type: "string",
        description: "Full formatted address",
      },
      {
        name: "latitude",
        type: "number",
        description: "Latitude of the result",
      },
      {
        name: "longitude",
        type: "number",
        description: "Longitude of the result",
      },
      {
        name: "placeId",
        type: "string",
        description: "Google Place ID",
        hidden: true,
      },
      {
        name: "addressComponents",
        type: "json",
        description: "Detailed address components",
        hidden: true,
      },
      {
        name: "results",
        type: "json",
        description: "All geocoding results",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { address, latitude, longitude, language, region } = context.inputs;
      const apiKey = context.env.GOOGLE_API_KEY;

      if (!apiKey) {
        return this.createErrorResult("GOOGLE_API_KEY is not configured");
      }

      const hasAddress = address && typeof address === "string";
      const hasCoords =
        typeof latitude === "number" && typeof longitude === "number";

      if (!hasAddress && !hasCoords) {
        return this.createErrorResult(
          "Provide either an address or latitude/longitude"
        );
      }

      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("key", apiKey);

      if (hasAddress) {
        url.searchParams.set("address", address as string);
      } else {
        url.searchParams.set("latlng", `${latitude},${longitude}`);
      }

      if (language && typeof language === "string") {
        url.searchParams.set("language", language);
      }

      if (region && typeof region === "string") {
        url.searchParams.set("region", region);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "User-Agent": "Dafthunk/1.0" },
      });

      if (!response.ok) {
        return this.createErrorResult(
          `Geocoding API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as {
        status: string;
        results: Array<{
          formatted_address: string;
          geometry: {
            location: { lat: number; lng: number };
          };
          place_id: string;
          address_components: Array<{
            long_name: string;
            short_name: string;
            types: string[];
          }>;
        }>;
      };

      if (data.status !== "OK") {
        if (data.status === "ZERO_RESULTS") {
          return this.createSuccessResult({
            formattedAddress: "",
            latitude: null,
            longitude: null,
            placeId: "",
            addressComponents: [],
            results: [],
          });
        }
        return this.createErrorResult(`Geocoding API error: ${data.status}`);
      }

      const first = data.results[0];

      return this.createSuccessResult({
        formattedAddress: first.formatted_address,
        latitude: first.geometry.location.lat,
        longitude: first.geometry.location.lng,
        placeId: first.place_id,
        addressComponents: first.address_components.map((c) => ({
          longName: c.long_name,
          shortName: c.short_name,
          types: c.types,
        })),
        results: data.results.map((r) => ({
          formattedAddress: r.formatted_address,
          latitude: r.geometry.location.lat,
          longitude: r.geometry.location.lng,
          placeId: r.place_id,
        })),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error querying Geocoding API"
      );
    }
  }
}
