import { vi } from "vitest";

// Mock mailparser and its CommonJS dependencies
vi.mock("mailparser", () => ({
  simpleParser: vi.fn().mockResolvedValue({
    subject: "Test Subject",
    text: "Test plain text content",
    html: "<p>Test HTML content</p>",
    from: { value: [{ address: "sender@example.com", name: "Test Sender" }] },
    to: {
      value: [{ address: "recipient@example.com", name: "Test Recipient" }],
    },
    cc: null,
    bcc: null,
    replyTo: null,
    date: new Date("2024-01-01T00:00:00.000Z"),
    messageId: "<test-message-id@example.com>",
    inReplyTo: null,
    references: [],
    priority: "normal",
  }),
  ParsedMail: vi.fn(),
}));

// Mock SendGrid mail service
vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn().mockResolvedValue([
      {
        statusCode: 202,
        body: "",
        headers: {},
      },
    ]),
  },
  setApiKey: vi.fn(),
  send: vi.fn().mockResolvedValue([
    {
      statusCode: 202,
      body: "",
      headers: {},
    },
  ]),
}));

// Mock SendGrid client packages
vi.mock("@sendgrid/client", () => ({}));

// Mock Twilio package
vi.mock("twilio", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: "SM1234567890",
        status: "queued",
      }),
    },
  })),
  Twilio: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: "SM1234567890",
        status: "queued",
      }),
    },
  })),
}));

// Mock the problematic CommonJS dependencies
vi.mock("encoding-japanese", () => ({}));
vi.mock("libmime", () => ({}));
vi.mock("mailsplit", () => ({}));

// Mock Turf.js and its dependencies to fix module resolution issues
vi.mock("@turf/turf", () => ({
  along: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: {}
  }),
  area: vi.fn().mockReturnValue(100),
  bbox: vi.fn().mockReturnValue([0, 0, 1, 1]),
  bboxPolygon: vi.fn().mockImplementation((bbox, options = {}) => ({
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[bbox[0], bbox[1]], [bbox[0], bbox[3]], [bbox[2], bbox[3]], [bbox[2], bbox[1]], [bbox[0], bbox[1]]]] },
    properties: options.properties || {},
    ...(options.id && { id: options.id })
  })),
  bearing: vi.fn().mockReturnValue(45),
  buffer: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
    properties: {}
  }),
  centroid: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0.5, 0.5] },
    properties: {}
  }),
  centerOfMass: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0.5, 0.5] },
    properties: {}
  }),
  center: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0.5, 0.5] },
    properties: {}
  }),
  circle: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
    properties: {}
  }),
  destination: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Point", coordinates: [1, 1] },
    properties: {}
  }),
  distance: vi.fn().mockReturnValue(1.414),
  envelope: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
    properties: {}
  }),
  length: vi.fn().mockReturnValue(10),
  midpoint: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0.5, 0.5] },
    properties: {}
  }),
  point: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: {}
  }),
  polygon: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
    properties: {}
  }),
  linestring: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
    properties: {}
  }),
  simplify: vi.fn().mockImplementation((geojson) => geojson),
  convex: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
    properties: {}
  }),
  angle: vi.fn().mockImplementation((start, vertex, end, options = {}) => {
    // Simple angle calculation for testing
    const dx1 = vertex[0] - start[0];
    const dy1 = vertex[1] - start[1];
    const dx2 = end[0] - vertex[0];
    const dy2 = end[1] - vertex[1];
    
    const dot = dx1 * dx2 + dy1 * dy2;
    const det = dx1 * dy2 - dy1 * dx2;
    let angle = Math.atan2(det, dot) * 180 / Math.PI;
    
    if (angle < 0) angle += 360;
    
    if (options.explementary) {
      angle = 360 - angle;
    }
    
    return angle;
  }),
  nearestPoint: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: { distance: 0, location: 0 }
  }),
  explode: vi.fn().mockReturnValue({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {}
      }
    ]
  }),
  flip: vi.fn().mockImplementation((geojson) => geojson),
  booleanContains: vi.fn().mockReturnValue(true),
  booleanOverlap: vi.fn().mockReturnValue(true),
  booleanCrosses: vi.fn().mockReturnValue(false),
  booleanDisjoint: vi.fn().mockReturnValue(false),
  booleanPointInPolygon: vi.fn().mockReturnValue(true),
  union: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
    properties: {}
  }),
  intersect: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
    properties: {}
  }),
  difference: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
    properties: {}
  }),
  lineIntersect: vi.fn().mockReturnValue({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [0.5, 0.5] },
        properties: {}
      }
    ]
  }),
  transformRotate: vi.fn().mockImplementation((geojson) => geojson),
  combine: vi.fn().mockReturnValue({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {}
      }
    ]
  }),
  rhumbBearing: vi.fn().mockReturnValue(45),
  rhumbDistance: vi.fn().mockReturnValue(1.414),
  transformTranslate: vi.fn().mockImplementation((geojson) => geojson),
  transformScale: vi.fn().mockImplementation((geojson) => geojson),
  rhumbDestination: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Point", coordinates: [1, 1] },
    properties: {}
  }),
  greatCircle: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
    properties: {}
  }),
  pointOnFeature: vi.fn().mockReturnValue({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0.5, 0.5] },
    properties: {}
  }),
  pointToLineDistance: vi.fn().mockReturnValue(1.414),
  pointToPolygonDistance: vi.fn().mockReturnValue(1.0),
  polygonTangents: vi.fn().mockReturnValue({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [1, 1] },
        properties: {}
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-1, -1] },
        properties: {}
      }
    ]
  }),
  square: vi.fn().mockReturnValue([0, 0, 10, 10]),
  cleanCoords: vi.fn().mockImplementation((geojson) => {
    // Mock implementation that returns the input geojson
    // This simulates the cleaning behavior without testing the actual algorithm
    return geojson;
  }),
  rewind: vi.fn().mockImplementation((geojson) => {
    // Mock implementation that returns the input geojson
    // This simulates the rewinding behavior without testing the actual algorithm
    return geojson;
  }),
}));

// Mock d3-geo to prevent module resolution issues
vi.mock("d3-geo", () => ({
  geoArea: vi.fn().mockReturnValue(100),
  geoLength: vi.fn().mockReturnValue(10),
  geoCentroid: vi.fn().mockReturnValue([0.5, 0.5]),
  geoBounds: vi.fn().mockReturnValue([[0, 0], [1, 1]]),
  geoDistance: vi.fn().mockReturnValue(1.414),
  geoRotation: vi.fn().mockReturnValue({
    forward: vi.fn().mockImplementation((point) => point),
    inverse: vi.fn().mockImplementation((point) => point),
  }),
}));
