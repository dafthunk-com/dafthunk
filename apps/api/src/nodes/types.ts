// Types for workflows
import {
  Feature,
  FeatureCollection,
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Node,
  NodeExecution,
  NodeType,
  Point,
  Polygon,
} from "@dafthunk/types";

export type ImageParameter = {
  data: Uint8Array;
  mimeType:
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/svg+xml"
    | "image/gif"
    | "image/tiff";
};

export type AudioParameter = {
  data: Uint8Array;
  mimeType:
    | "audio/wav"
    | "audio/mp3"
    | "audio/m4a"
    | "audio/ogg"
    | "audio/mpeg"
    | "audio/mp4";
};

export type DocumentParameter = {
  data: Uint8Array;
  mimeType:
    | "application/pdf"
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/svg+xml"
    | "text/html"
    | "application/xml"
    | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    | "application/vnd.ms-excel"
    | "application/vnd.oasis.opendocument.spreadsheet"
    | "text/csv"
    | "application/vnd.apple.numbers";
};

export type ParameterType =
  | {
      type: "string";
      value?: string;
    }
  | {
      type: "number";
      value?: number;
    }
  | {
      type: "boolean";
      value?: boolean;
    }
  | {
      type: "image";
      value?: ImageParameter;
    }
  | {
      type: "json";
      value?: any;
    }
  | {
      type: "document";
      value?: DocumentParameter;
    }
  | {
      type: "audio";
      value?: AudioParameter;
    }
  | {
      type: "point";
      value?: Point;
    }
  | {
      type: "multipoint";
      value?: MultiPoint;
    }
  | {
      type: "linestring";
      value?: LineString;
    }
  | {
      type: "multilinestring";
      value?: MultiLineString;
    }
  | {
      type: "polygon";
      value?: Polygon;
    }
  | {
      type: "multipolygon";
      value?: MultiPolygon;
    }
  | {
      type: "geometry";
      value?: Geometry;
    }
  | {
      type: "geometrycollection";
      value?: GeometryCollection;
    }
  | {
      type: "feature";
      value?: Feature;
    }
  | {
      type: "featurecollection";
      value?: FeatureCollection;
    }
  | {
      type: "any";
      value: any;
    };

export type ParameterValue = ParameterType["value"];

export interface HttpRequest {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  formData?: Record<string, string | File>;
}

export interface EmailMessage {
  from: string;
  to: string;
  headers: Record<string, string>;
  raw: string;
}

export interface NodeContext {
  nodeId: string;
  workflowId: string;
  organizationId: string;
  inputs: Record<string, any>;
  onProgress?: (progress: number) => void;
  httpRequest?: HttpRequest;
  emailMessage?: EmailMessage;
  env: {
    DB: D1Database;
    AI: Ai;
    AI_OPTIONS: AiOptions;
    RESSOURCES: R2Bucket;
    DATASETS: R2Bucket;
    DATASETS_AUTORAG: string;
    EMAIL_DOMAIN: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
    CLOUDFLARE_AI_GATEWAY_ID?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_PHONE_NUMBER?: string;
    SENDGRID_API_KEY?: string;
    SENDGRID_DEFAULT_FROM?: string;
    RESEND_API_KEY?: string;
    RESEND_DEFAULT_FROM?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_REGION?: string;
    SES_DEFAULT_FROM?: string;
  };
}

/**
 * Base class for all executable nodes
 */
export abstract class ExecutableNode {
  public readonly node: Node;
  public static readonly nodeType: NodeType;

  constructor(node: Node) {
    this.node = node;
  }

  public abstract execute(context: NodeContext): Promise<NodeExecution>;

  protected createSuccessResult(
    outputs: Record<string, ParameterValue>
  ): NodeExecution {
    return {
      nodeId: this.node.id,
      status: "completed",
      outputs,
    } as NodeExecution;
  }

  protected createErrorResult(error: string): NodeExecution {
    return {
      nodeId: this.node.id,
      status: "error",
      error,
    } as NodeExecution;
  }
}
