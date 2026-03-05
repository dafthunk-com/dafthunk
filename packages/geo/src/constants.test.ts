import {
  convertArea as turfConvertArea,
  convertLength as turfConvertLength,
  degreesToRadians as turfDegreesToRadians,
  lengthToRadians as turfLengthToRadians,
  radiansToDegrees as turfRadiansToDegrees,
  radiansToLength as turfRadiansToLength,
} from "@turf/helpers";
import { describe, expect, it } from "vitest";
import {
  convertArea,
  convertLength,
  degreesToRadians,
  lengthToRadians,
  radiansToDegrees,
  radiansToLength,
} from "./constants";

describe("degreesToRadians", () => {
  it("converts 0 degrees", () => {
    expect(degreesToRadians(0)).toBe(0);
    expect(degreesToRadians(0)).toBe(turfDegreesToRadians(0));
  });

  it("converts 90 degrees", () => {
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
    expect(degreesToRadians(90)).toBe(turfDegreesToRadians(90));
  });

  it("converts 180 degrees", () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
    expect(degreesToRadians(180)).toBe(turfDegreesToRadians(180));
  });

  it("converts 360 degrees", () => {
    expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
    // turf normalizes 360 to 0; our implementation does not normalize
    const turfResult = turfDegreesToRadians(360);
    expect(turfResult).toBe(0);
    expect(degreesToRadians(360) % (2 * Math.PI)).toBeCloseTo(turfResult, 10);
  });

  it("converts negative degrees", () => {
    expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2);
    expect(degreesToRadians(-90)).toBe(turfDegreesToRadians(-90));
  });
});

describe("radiansToDegrees", () => {
  it("converts 0 radians", () => {
    expect(radiansToDegrees(0)).toBe(0);
    expect(radiansToDegrees(0)).toBe(turfRadiansToDegrees(0));
  });

  it("converts PI/2 radians", () => {
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
    expect(radiansToDegrees(Math.PI / 2)).toBe(
      turfRadiansToDegrees(Math.PI / 2)
    );
  });

  it("converts PI radians", () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
    expect(radiansToDegrees(Math.PI)).toBe(turfRadiansToDegrees(Math.PI));
  });

  it("converts 2*PI radians", () => {
    expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360);
    // turf normalizes 2*PI to 0 degrees; our implementation does not normalize
    const turfResult = turfRadiansToDegrees(2 * Math.PI);
    expect(turfResult).toBe(0);
    expect(radiansToDegrees(2 * Math.PI) % 360).toBeCloseTo(turfResult, 10);
  });

  it("converts negative radians", () => {
    expect(radiansToDegrees(-Math.PI)).toBeCloseTo(-180);
    expect(radiansToDegrees(-Math.PI)).toBe(turfRadiansToDegrees(-Math.PI));
  });
});

describe("lengthToRadians and radiansToLength roundtrip", () => {
  const units = [
    "meters",
    "millimeters",
    "centimeters",
    "kilometers",
    "miles",
    "nauticalmiles",
    "yards",
    "feet",
    "radians",
    "degrees",
  ] as const;

  for (const unit of units) {
    it(`roundtrips for ${unit}`, () => {
      const distance = 100;
      const radians = lengthToRadians(distance, unit);
      const back = radiansToLength(radians, unit);
      expect(back).toBeCloseTo(distance, 6);
    });

    it(`matches turf for lengthToRadians with ${unit}`, () => {
      const distance = 42.5;
      expect(lengthToRadians(distance, unit)).toBe(
        turfLengthToRadians(distance, unit)
      );
    });

    it(`matches turf for radiansToLength with ${unit}`, () => {
      const radians = 0.005;
      expect(radiansToLength(radians, unit)).toBe(
        turfRadiansToLength(radians, unit)
      );
    });
  }

  // inches has a slightly different factor between implementations, test with toBeCloseTo
  it("roundtrips for inches", () => {
    const distance = 100;
    const radians = lengthToRadians(distance, "inches");
    const back = radiansToLength(radians, "inches");
    expect(back).toBeCloseTo(distance, 6);
  });

  it("is close to turf for lengthToRadians with inches", () => {
    const distance = 42.5;
    expect(lengthToRadians(distance, "inches")).toBeCloseTo(
      turfLengthToRadians(distance, "inches"),
      8
    );
  });

  it("is close to turf for radiansToLength with inches", () => {
    const radians = 0.005;
    // inches factor differs slightly between implementations; verify relative closeness
    const ours = radiansToLength(radians, "inches");
    const theirs = turfRadiansToLength(radians, "inches");
    expect(Math.abs(ours - theirs) / theirs).toBeLessThan(0.00001);
  });
});

describe("convertLength", () => {
  it("converts kilometers to miles", () => {
    const result = convertLength(1, "kilometers", "miles");
    const turfResult = turfConvertLength(1, "kilometers", "miles");
    expect(result).toBeCloseTo(0.621371, 4);
    expect(result).toBe(turfResult);
  });

  it("converts meters to feet", () => {
    const result = convertLength(1, "meters", "feet");
    const turfResult = turfConvertLength(1, "meters", "feet");
    expect(result).toBeCloseTo(3.28084, 4);
    expect(result).toBe(turfResult);
  });

  it("returns same value for same unit", () => {
    expect(convertLength(123.456, "kilometers", "kilometers")).toBe(123.456);
    expect(convertLength(123.456, "meters", "meters")).toBe(123.456);
  });

  it("converts miles to kilometers", () => {
    const result = convertLength(1, "miles", "kilometers");
    const turfResult = turfConvertLength(1, "miles", "kilometers");
    expect(result).toBeCloseTo(1.60934, 4);
    expect(result).toBe(turfResult);
  });

  it("converts nautical miles to meters", () => {
    const result = convertLength(1, "nauticalmiles", "meters");
    const turfResult = turfConvertLength(1, "nauticalmiles", "meters");
    expect(result).toBeCloseTo(1852, 0);
    expect(result).toBe(turfResult);
  });

  it("converts inches to centimeters", () => {
    const result = convertLength(1, "inches", "centimeters");
    const turfResult = turfConvertLength(1, "inches", "centimeters");
    expect(result).toBeCloseTo(2.54, 1);
    expect(result).toBeCloseTo(turfResult, 3);
  });
});

describe("convertArea", () => {
  it("converts square meters to square kilometers", () => {
    const result = convertArea(1_000_000, "meters", "kilometers");
    const turfResult = turfConvertArea(1_000_000, "meters", "kilometers");
    expect(result).toBeCloseTo(1, 6);
    expect(result).toBe(turfResult);
  });

  it("converts square kilometers to square meters", () => {
    const result = convertArea(1, "kilometers", "meters");
    const turfResult = turfConvertArea(1, "kilometers", "meters");
    expect(result).toBeCloseTo(1_000_000, 0);
    expect(result).toBe(turfResult);
  });

  it("converts square miles to square kilometers", () => {
    const result = convertArea(1, "miles", "kilometers");
    const turfResult = turfConvertArea(1, "miles", "kilometers");
    expect(result).toBeCloseTo(2.58999, 3);
    expect(result).toBeCloseTo(turfResult, 2);
  });

  it("converts square feet to square meters", () => {
    const result = convertArea(10.7639, "feet", "meters");
    const turfResult = turfConvertArea(10.7639, "feet", "meters");
    expect(result).toBeCloseTo(1, 2);
    expect(result).toBeCloseTo(turfResult, 4);
  });
});
