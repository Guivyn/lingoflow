import { sanitizeDnrList } from "./requestGuard";

export const CSP_RULE_START_ID = 1;
export const ORI_RULE_START_ID = 10000;

const CSP_REMOVE_HEADERS = [
  "content-security-policy",
  "content-security-policy-report-only",
  "x-webkit-csp",
  "x-content-security-policy",
];

/**
 * Build the DNR update without depending on browser APIs.
 * @param {Object} input
 * @param {Array<Object>} input.oldRules Existing dynamic rules
 * @param {Array<string>|string} [input.csplist] CSP response-header filters
 * @param {Array<string>|string} [input.orilist] Origin request-header filters
 * @param {string} [input.extensionInitiatorDomain] Extension hostname used to scope Origin rules
 * @returns {{removeRuleIds: number[], addRules: Array<Object>}}
 */
export function buildDynamicRuleUpdate({
  oldRules = [],
  csplist,
  orilist,
  extensionInitiatorDomain = "",
}) {
  const removeRuleIds = [];
  const addRules = [];

  if (csplist !== undefined) {
    removeRuleIds.push(
      ...oldRules
        .filter(
          (rule) => rule.id >= CSP_RULE_START_ID && rule.id < ORI_RULE_START_ID
        )
        .map((rule) => rule.id)
    );

    addRules.push(
      ...sanitizeDnrList(csplist).map((url, index) => ({
        id: CSP_RULE_START_ID + index,
        action: {
          type: "modifyHeaders",
          responseHeaders: CSP_REMOVE_HEADERS.map((header) => ({
            operation: "remove",
            header,
          })),
        },
        condition: {
          urlFilter: url,
          resourceTypes: ["main_frame", "sub_frame"],
        },
      }))
    );
  }

  if (orilist !== undefined) {
    removeRuleIds.push(
      ...oldRules
        .filter((rule) => rule.id >= ORI_RULE_START_ID)
        .map((rule) => rule.id)
    );

    if (extensionInitiatorDomain) {
      addRules.push(
        ...sanitizeDnrList(orilist).map((url, index) => ({
          id: ORI_RULE_START_ID + index,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              { header: "Origin", operation: "set", value: url },
            ],
          },
          condition: {
            urlFilter: url,
            resourceTypes: ["xmlhttprequest"],
            initiatorDomains: [extensionInitiatorDomain],
          },
        }))
      );
    }
  }

  return { removeRuleIds, addRules };
}
