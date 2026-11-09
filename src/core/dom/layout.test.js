import {
  createLayoutReader,
  getNodeLayout,
  hasBlockDescendantLayout,
} from "./layout";

describe("DOM layout classification", () => {
  test("uses computed display values instead of tag names", () => {
    const paragraph = document.createElement("p");
    const inlineDiv = document.createElement("div");
    const gridSpan = document.createElement("span");
    paragraph.style.display = "inline";
    inlineDiv.style.display = "inline-block";
    gridSpan.style.display = "grid";

    expect(getNodeLayout(paragraph)).toBe("inline");
    expect(getNodeLayout(inlineDiv)).toBe("atomic");
    expect(getNodeLayout(gridSpan)).toBe("block");
  });

  test("caches computed layout only for the reader lifetime", () => {
    const node = document.createElement("div");
    node.style.display = "inline";
    const firstScan = createLayoutReader();

    expect(firstScan(node)).toBe("inline");
    node.style.display = "block";
    expect(firstScan(node)).toBe("inline");
    expect(createLayoutReader()(node)).toBe("block");
  });

  test("finds block descendants through inline containers", () => {
    const root = document.createElement("span");
    const nested = document.createElement("span");
    const block = document.createElement("div");
    root.append(nested);
    nested.append(block);

    expect(hasBlockDescendantLayout(root)).toBe(true);
    block.style.display = "none";
    expect(hasBlockDescendantLayout(root)).toBe(false);
  });
});
