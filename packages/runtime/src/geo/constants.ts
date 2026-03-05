import type { Units } from "./types";

export const earthRadius = 6371008.8;

export const factors: Record<Units, number> = {
  centimeters: earthRadius * 100,
  degrees: 360 / (2 * Math.PI),
  feet: earthRadius * 3.28084,
  inches: earthRadius * 39.3701,
  kilometers: earthRadius / 1000,
  meters: earthRadius,
  miles: earthRadius / 1609.344,
  millimeters: earthRadius * 1000,
  nauticalmiles: earthRadius / 1852,
  radians: 1,
  acres: earthRadius / 63.6149,
  yards: earthRadius * 1.0936,
};

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function lengthToRadians(distance: number, units: Units = "kilometers"): number {
  const factor = factors[units];
  return distance / factor;
}

export function radiansToLength(radians: number, units: Units = "kilometers"): number {
  const factor = factors[units];
  return radians * factor;
}

export function convertLength(
  length: number,
  originalUnit: Units = "kilometers",
  finalUnit: Units = "kilometers",
): number {
  if (originalUnit === finalUnit) return length;
  return radiansToLength(lengthToRadians(length, originalUnit), finalUnit);
}

export function convertArea(
  area: number,
  originalUnit: Units = "meters",
  finalUnit: Units = "kilometers",
): number {
  const startFactor = factors[originalUnit];
  const finalFactor = factors[finalUnit];
  return area / (startFactor * startFactor) * (finalFactor * finalFactor);
}
