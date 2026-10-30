import { describe, expect, it } from "vitest";
import { createCompleteRemate } from "../test/fixtures";
import { getFeaturedRemate, getRemateBySlug } from "./siteSelectors";

describe("selectores del sitio", () => {
  const first = createCompleteRemate({ id: "primero", slug: "primero" });
  const second = createCompleteRemate({ id: "segundo", slug: "segundo" });

  it("elige el primer remate como destacado y contempla listas vacías", () => {
    expect(getFeaturedRemate([first, second])).toBe(first);
    expect(getFeaturedRemate([])).toBeUndefined();
  });

  it("encuentra remates por slug", () => {
    expect(getRemateBySlug([first, second], "segundo")).toBe(second);
    expect(getRemateBySlug([first, second], "inexistente")).toBeUndefined();
    expect(getRemateBySlug([first, second])).toBeUndefined();
  });

});
