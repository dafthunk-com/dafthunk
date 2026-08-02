import { describe, expect, it } from "vitest";
import {
  deepClone,
  deepEqual,
  getAtPath,
  hasKey,
  hasPath,
  isJsonArray,
  isJsonObject,
  readKey,
  splitPath,
  writeKey,
} from "./json-access";

describe("json-access", () => {
  describe("isJsonObject", () => {
    it("accepts plain objects", () => {
      expect(isJsonObject({})).toBe(true);
      expect(isJsonObject({ a: 1 })).toBe(true);
    });

    it("rejects arrays, null and primitives", () => {
      expect(isJsonObject([])).toBe(false);
      expect(isJsonObject(null)).toBe(false);
      expect(isJsonObject("a")).toBe(false);
      expect(isJsonObject(1)).toBe(false);
      expect(isJsonObject(undefined)).toBe(false);
    });
  });

  describe("isJsonArray", () => {
    it("accepts arrays only", () => {
      expect(isJsonArray([])).toBe(true);
      expect(isJsonArray({})).toBe(false);
      expect(isJsonArray(null)).toBe(false);
    });
  });

  describe("readKey", () => {
    it("reads object properties", () => {
      expect(readKey({ a: 1 }, "a")).toBe(1);
    });

    it("reads array indices from numbers and numeric strings", () => {
      expect(readKey([10, 20], 1)).toBe(20);
      expect(readKey([10, 20], "0")).toBe(10);
    });

    it("returns undefined for non-containers and absent keys", () => {
      expect(readKey("text", "a")).toBeUndefined();
      expect(readKey(null, "a")).toBeUndefined();
      expect(readKey({ a: 1 }, "b")).toBeUndefined();
      expect(readKey([1], "notAnIndex")).toBeUndefined();
    });
  });

  describe("writeKey", () => {
    it("writes into objects and arrays", () => {
      const obj = { a: 1 };
      expect(writeKey(obj, "b", 2)).toBe(true);
      expect(obj).toEqual({ a: 1, b: 2 });

      const arr = [1, 2];
      expect(writeKey(arr, 0, 9)).toBe(true);
      expect(arr).toEqual([9, 2]);
    });

    it("refuses to write into a non-container", () => {
      expect(writeKey("text", "a", 1)).toBe(false);
      expect(writeKey(null, "a", 1)).toBe(false);
    });
  });

  describe("hasKey", () => {
    it("distinguishes present keys from absent ones", () => {
      expect(hasKey({ a: undefined }, "a")).toBe(true);
      expect(hasKey({ a: 1 }, "b")).toBe(false);
      expect(hasKey([1, 2], 1)).toBe(true);
      expect(hasKey([1, 2], 5)).toBe(false);
      expect(hasKey("text", "a")).toBe(false);
    });
  });

  describe("splitPath", () => {
    it("drops the root and empty segments", () => {
      expect(splitPath("$.a.b")).toEqual(["a", "b"]);
      expect(splitPath("a.b")).toEqual(["a", "b"]);
      expect(splitPath("$")).toEqual([]);
      expect(splitPath("")).toEqual([]);
    });
  });

  describe("getAtPath", () => {
    const doc = { user: { tags: ["x", "y"] }, n: 0 };

    it("returns the document for the root path", () => {
      expect(getAtPath(doc, "$")).toBe(doc);
      expect(getAtPath(doc, "")).toBe(doc);
    });

    it("walks nested keys and array indices", () => {
      expect(getAtPath(doc, "$.user.tags[1]")).toBe("y");
      expect(getAtPath(doc, "$.n")).toBe(0);
    });

    it("returns undefined when a segment is missing", () => {
      expect(getAtPath(doc, "$.user.email")).toBeUndefined();
      expect(getAtPath(doc, "$.missing.deep")).toBeUndefined();
      expect(getAtPath(doc, "$.n.deep")).toBeUndefined();
      expect(getAtPath(doc, "$.user.tags[9]")).toBeUndefined();
    });
  });

  describe("hasPath", () => {
    const doc = { a: { b: null }, list: [1] };

    it("treats a key holding null as present", () => {
      expect(hasPath(doc, "$.a.b")).toBe(true);
    });

    it("reports absent keys and out-of-range indices", () => {
      expect(hasPath(doc, "$.a.c")).toBe(false);
      expect(hasPath(doc, "$.list[0]")).toBe(true);
      expect(hasPath(doc, "$.list[3]")).toBe(false);
    });
  });

  describe("deepEqual", () => {
    it("compares nested structures by value", () => {
      expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
      expect(deepEqual({ a: [1] }, { a: [2] })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it("does not treat an array and an object as equal", () => {
      expect(deepEqual([], {})).toBe(false);
    });

    it("handles null and undefined", () => {
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
    });
  });

  describe("deepClone", () => {
    it("copies nested structures without sharing references", () => {
      const source = { a: [{ b: 1 }] };
      const copy = deepClone(source);

      expect(copy).toEqual(source);
      expect(copy).not.toBe(source);
      expect(copy.a).not.toBe(source.a);
      expect(copy.a[0]).not.toBe(source.a[0]);
    });

    it("returns primitives as-is", () => {
      expect(deepClone(5)).toBe(5);
      expect(deepClone(null)).toBe(null);
    });
  });
});
