import {
  buildDynamicRuleUpdate,
  CSP_RULE_START_ID,
  ORI_RULE_START_ID,
} from "./dnrRules";

describe("buildDynamicRuleUpdate", () => {
  test("scopes Origin rewrites to extension initiated requests", () => {
    const result = buildDynamicRuleUpdate({
      oldRules: [{ id: 10003 }, { id: 20000 }],
      orilist: ["https://api.example.com", "*.invalid"],
      extensionInitiatorDomain: "abcdefghijklmnop",
    });

    expect(result.removeRuleIds).toEqual([10003, 20000]);
    expect(result.addRules).toEqual([
      {
        id: ORI_RULE_START_ID,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "Origin",
              operation: "set",
              value: "https://api.example.com",
            },
          ],
        },
        condition: {
          urlFilter: "https://api.example.com",
          resourceTypes: ["xmlhttprequest"],
          initiatorDomains: ["abcdefghijklmnop"],
        },
      },
    ]);
  });

  test("updates only requested rule groups and clears Origin rules without an extension origin", () => {
    const oldRules = [{ id: 4 }, { id: ORI_RULE_START_ID + 2 }, { id: 20000 }];
    const cspUpdate = buildDynamicRuleUpdate({
      oldRules,
      csplist: "https://site.example.com",
    });
    const originUpdate = buildDynamicRuleUpdate({
      oldRules,
      orilist: "https://api.example.com",
    });

    expect(cspUpdate.removeRuleIds).toEqual([4]);
    expect(cspUpdate.addRules[0]).toMatchObject({
      id: CSP_RULE_START_ID,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { operation: "remove", header: "content-security-policy" },
          {
            operation: "remove",
            header: "content-security-policy-report-only",
          },
          { operation: "remove", header: "x-webkit-csp" },
          { operation: "remove", header: "x-content-security-policy" },
        ],
      },
      condition: {
        urlFilter: "https://site.example.com",
        resourceTypes: ["main_frame", "sub_frame"],
      },
    });
    expect(originUpdate.removeRuleIds).toEqual([ORI_RULE_START_ID + 2, 20000]);
    expect(originUpdate.addRules).toEqual([]);
  });
});
