/**
 * PART 1 (continued): Snowflake ID Generator Tests
 */

import { describe, it, expect } from "vitest";
import { Snowflake } from "../../../packages/engine/src/trade/Snowflake";

describe("Snowflake — ID Generation", () => {
  it("should generate unique IDs", () => {
    const snowflake = new Snowflake(1);
    const ids = new Set<bigint>();
    const count = 10000;

    for (let i = 0; i < count; i++) {
      ids.add(snowflake.generate());
    }

    expect(ids.size).toBe(count);
  });

  it("should generate monotonically increasing IDs", () => {
    const snowflake = new Snowflake(1);
    let prev = snowflake.generate();

    for (let i = 0; i < 1000; i++) {
      const current = snowflake.generate();
      expect(current).toBeGreaterThan(prev);
      prev = current;
    }
  });

  it("should generate bigint IDs", () => {
    const snowflake = new Snowflake(1);
    const id = snowflake.generate();
    expect(typeof id).toBe("bigint");
  });

  it("should reject invalid worker IDs", () => {
    expect(() => new Snowflake(-1)).toThrow();
    expect(() => new Snowflake(1024)).toThrow();
  });

  it("should accept valid worker ID range boundaries", () => {
    expect(() => new Snowflake(0)).not.toThrow();
    expect(() => new Snowflake(1023)).not.toThrow();
  });

  it("should generate different IDs for different workers", () => {
    const s1 = new Snowflake(1);
    const s2 = new Snowflake(2);

    const id1 = s1.generate();
    const id2 = s2.generate();

    expect(id1).not.toBe(id2);
  });
});
