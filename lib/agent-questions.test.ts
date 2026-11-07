import { describe, expect, it } from "vitest";
import {
  agentEscalationSchema,
  classifyEscalation,
  escalationTypeToSlug,
  parseEscalationBody,
  slugToEscalationType,
} from "./agent-questions";

describe("security escalation type (#878)", () => {
  it("parses a [security] or [vulnerability] tag to the Security type", () => {
    expect(parseEscalationBody("[security] Found an XSS in the share dialog")).toEqual({
      type: "Security",
      cleanBody: "Found an XSS in the share dialog",
    });
    expect(parseEscalationBody("[vulnerability] a leaked key in the logs").type).toBe("Security");
  });

  it("classifies vulnerability language as Security, ahead of Blocker", () => {
    expect(classifyEscalation("There is an auth bypass on /login")).toBe("Security");
    expect(classifyEscalation("SQL injection in the search box")).toBe("Security");
    expect(classifyEscalation("found a leaked secret in the repo")).toBe("Security");
    // A plain operational blocker is still a blocker.
    expect(classifyEscalation("Stuck: no database credentials")).toBe("Blocker");
  });

  it("maps the security slug in both directions", () => {
    expect(escalationTypeToSlug("Security")).toBe("security");
    expect(slugToEscalationType("security")).toBe("Security");
  });

  it("accepts type: security on the escalation schema and refuses unknown types", () => {
    expect(agentEscalationSchema.safeParse({ body: "Found an XSS", type: "security" }).success).toBe(true);
    expect(agentEscalationSchema.safeParse({ body: "hello", type: "nonsense" }).success).toBe(false);
  });
});
