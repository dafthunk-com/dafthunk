import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Google Places node implementation
 * Searches for places using the Places API (New)
 */
export class PlacesGoogleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "places-google",
    name: "Places (Google)",
    type: "places-google",
    description: "Search for places using Google Places API",
    tags: ["Google", "Maps", "Places", "Search"],
    icon: "map-pin",
    documentation:
      "This node searches for places using the Google Places API (New). Search by text query with optional location bias. Returns place names, addresses, coordinates, ratings, and more.",
    usage: 100,
    asTool: true,
    inputs: [
      {
        name: "query",
        type: "string",
        description:
          "Text search query (e.g., 'restaurants in Paris', 'coffee near me')",
        required: true,
      },
      {
        name: "latitude",
        type: "number",
        description: "Latitude for location bias",
        required: false,
      },
      {
        name: "longitude",
        type: "number",
        description: "Longitude for location bias",
        required: false,
      },
      {
        name: "radius",
        type: "number",
        description: "Search radius in meters for location bias (default 5000)",
        required: false,
        hidden: true,
      },
      {
        name: "maxResults",
        type: "number",
        description: "Maximum number of results (1-20, default 10)",
        required: false,
        hidden: true,
      },
      {
        name: "type",
        type: "string",
        description:
          "Place type filter (e.g., restaurant, cafe, hotel, hospital)",
        required: false,
        hidden: true,
      },
      {
        name: "openNow",
        type: "string",
        description:
          "Set to 'true' to only return places that are currently open",
        required: false,
        hidden: true,
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
        name: "places",
        type: "json",
        description: "Array of place results",
      },
      {
        name: "count",
        type: "number",
        description: "Number of results returned",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        query,
        latitude,
        longitude,
        radius,
        maxResults,
        type,
        openNow,
        languageCode,
      } = context.inputs;
      const apiKey = context.env.GOOGLE_API_KEY;

      if (!apiKey) {
        return this.createErrorResult("GOOGLE_API_KEY is not configured");
      }

      if (!query || typeof query !== "string") {
        return this.createErrorResult("Search query is required");
      }

      const body: Record<string, unknown> = {
        textQuery: query,
      };

      if (typeof latitude === "number" && typeof longitude === "number") {
        body.locationBias = {
          circle: {
            center: { latitude, longitude },
            radius: radius && typeof radius === "number" ? radius : 5000,
          },
        };
      }

      if (maxResults && typeof maxResults === "number") {
        body.maxResultCount = Math.min(20, Math.max(1, maxResults));
      }

      if (type && typeof type === "string") {
        body.includedType = type;
      }

      if (openNow === "true") {
        body.openNow = true;
      }

      if (languageCode && typeof languageCode === "string") {
        body.languageCode = languageCode;
      }

      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.businessStatus,places.websiteUri",
            "User-Agent": "Dafthunk/1.0",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        return this.createErrorResult(
          `Places API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as {
        places?: Array<{
          id: string;
          displayName?: { text: string };
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
          types?: string[];
          rating?: number;
          userRatingCount?: number;
          businessStatus?: string;
          websiteUri?: string;
        }>;
      };

      const places = (data.places ?? []).map((place) => ({
        id: place.id,
        name: place.displayName?.text ?? "",
        address: place.formattedAddress ?? "",
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        types: place.types ?? [],
        rating: place.rating ?? null,
        ratingCount: place.userRatingCount ?? null,
        status: place.businessStatus ?? "",
        website: place.websiteUri ?? "",
      }));

      return this.createSuccessResult({
        places,
        count: places.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error querying Places API"
      );
    }
  }
}
