/** GeoTIFF metadata structure for JSON output */
export interface GeoTiffMetadata {
  /** Image dimensions */
  width: number;
  height: number;
  /** Geographic bounds [west, south, east, north] */
  bounds: [number, number, number, number];
  /** Coordinate reference system (EPSG code or WKT) */
  crs?: string;
  /** Pixel size [x_resolution, y_resolution] */
  pixelSize?: [number, number];
  /** No-data value */
  noDataValue?: number;
  /** Data type (e.g., "Float32", "UInt16") */
  dataType?: string;
  /** Number of bands */
  bandCount: number;
}
