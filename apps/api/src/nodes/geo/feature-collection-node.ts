import { NodeExecution, NodeType } from "@dafthunk/types";
import type { AllGeoJSON } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * FeatureCollection node implementation that aggregates multiple Features into a FeatureCollection
 */
export class FeatureCollectionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "feature-collection",
    name: "Feature Collection",
    type: "feature-collection",
    description: "Aggregates multiple GeoJSON Features into a FeatureCollection",
    tags: ["Geo"],
    icon: "layers",
    inputs: [
      { 
        name: "features", 
        type: "geojson", 
        description: "GeoJSON Features to aggregate (supports multiple connections)",
        required: true,
        repeated: true,
      },
    ],
    outputs: [{ 
      name: "featureCollection", 
      type: "geojson",
      description: "FeatureCollection containing all input features"
    }],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { features } = context.inputs;

      // Handle missing input
      if (features === null || features === undefined) {
        return this.createErrorResult("No features provided");
      }

      // Handle single feature input
      if (typeof features === "object" && features.type === "Feature") {
        return this.createSuccessResult({
          featureCollection: {
            type: "FeatureCollection",
            features: [features as any],
          },
        });
      }

      // Handle array of features (multiple connections)
      if (Array.isArray(features)) {
        // Handle empty array
        if (features.length === 0) {
          return this.createErrorResult("Cannot create FeatureCollection from empty array");
        }

        // Validate all inputs are valid GeoJSON Features
        const validFeatures: any[] = [];
        
        for (let i = 0; i < features.length; i++) {
          const feature = features[i];
          
          // Check if it's a valid Feature
          if (!feature || typeof feature !== "object") {
            return this.createErrorResult(
              `Invalid feature at position ${i}: expected Feature object, got ${typeof feature}`
            );
          }
          
          if (feature.type !== "Feature") {
            return this.createErrorResult(
              `Invalid feature at position ${i}: expected Feature type, got ${feature.type}`
            );
          }
          
          if (!feature.geometry) {
            return this.createErrorResult(
              `Invalid feature at position ${i}: missing geometry property`
            );
          }
          
          validFeatures.push(feature as any);
        }

        // Create FeatureCollection from valid features
        const result = {
          type: "FeatureCollection",
          features: validFeatures,
        };

        return this.createSuccessResult({
          featureCollection: result,
        });
      }

      // Handle single FeatureCollection input (pass through)
      if (typeof features === "object" && features.type === "FeatureCollection") {
        return this.createSuccessResult({
          featureCollection: features,
        });
      }

      return this.createErrorResult("Invalid input type: expected Feature, FeatureCollection, or array of Features");
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
} 