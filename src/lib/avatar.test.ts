import { describe, it, expect } from "vitest";
import { avatarColor, initials } from "./avatar";

describe("initials", () => {
  it("takes the first letters of the first two words, uppercased", () => {
    expect(initials("France 24")).toBe("F2");
    expect(initials("cable news network")).toBe("CN");
    expect(initials("TF1")).toBe("T");
  });

  it("strips punctuation and handles empty/odd names", () => {
    expect(initials("!!!")).toBe("?");
    expect(initials("")).toBe("?");
    expect(initials("  al-jazeera  ")).toBe("A");
  });
});

describe("avatarColor", () => {
  it("is deterministic for the same input", () => {
    expect(avatarColor("CNN")).toBe(avatarColor("CNN"));
  });

  it("differs for different inputs and returns a gradient", () => {
    expect(avatarColor("CNN")).not.toBe(avatarColor("BBC"));
    expect(avatarColor("CNN")).toMatch(/^linear-gradient\(/);
  });
});
