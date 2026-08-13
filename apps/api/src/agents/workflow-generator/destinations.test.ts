import { describe, expect, it } from "vitest";

import { achievableDestinations, defaultDestination } from "./destinations";
import { filterEligible } from "./eligibility";
import { FIXTURE_NODE_TYPES } from "./fixtures/node-types";

const ALL_PROVIDERS = new Set(["x", "google-mail", "discord", "linkedin"]);

interface Options {
  connectedProviders?: string[];
  availableProviders?: Set<string>;
  trigger?: "manual" | "http_request" | "scheduled";
}

function build(options: Options = {}) {
  const connectedProviders = new Set(options.connectedProviders ?? []);
  const { eligible } = filterEligible(FIXTURE_NODE_TYPES, {
    connectedProviders,
  });

  return achievableDestinations({
    eligible,
    trigger: options.trigger ?? "manual",
    availableProviders: options.availableProviders ?? ALL_PROVIDERS,
    nodeTypes: FIXTURE_NODE_TYPES,
    connectedProviders,
  });
}

const idsOf = (options: Options = {}) =>
  build(options).map((destination) => destination.id);

describe("achievableDestinations", () => {
  it("always offers somewhere the result can go", () => {
    // The bug this feature exists for: a workflow that computes an answer and
    // delivers it to nobody. Email and display are always reachable.
    expect(idsOf()).toContain("email");
    expect(idsOf()).toContain("display");
  });

  it("offers the responder for a synchronous trigger", () => {
    // `http-response` is a responder, so `filterEligible` drops it and it never
    // appears in `eligible`. Checking only that set would lose the one
    // destination an http_request workflow actually has.
    expect(idsOf({ trigger: "http_request" })).toContain("respond");
  });

  it("does not offer a responder to a trigger that has none", () => {
    expect(idsOf({ trigger: "scheduled" })).not.toContain("respond");
  });

  it("withholds a provider this deployment has no credentials for", () => {
    // Nothing to link, so nothing to offer — the OAuth round trip would dead
    // end on a missing client id.
    expect(
      idsOf({ connectedProviders: ["x"], availableProviders: new Set() })
    ).not.toContain("x");
  });

  it("never offers a bot send node", () => {
    // It needs an org-scoped channel id, which a generated workflow cannot
    // invent. Unlike a provider, no amount of linking fixes that.
    expect(idsOf({ connectedProviders: ["discord"] })).not.toContain("discord");
  });

  it("always ends in display", () => {
    const ids = idsOf();
    expect(ids[ids.length - 1]).toBe("display");
  });
});

describe("destinations that only need an account linked", () => {
  it("offers an unlinked provider rather than substituting for it", () => {
    // Someone who asks for X and silently gets an email instead has been
    // ignored. Offering it and asking them to link the account is the point.
    const x = build().find((destination) => destination.id === "x");
    expect(x?.requiresConnection).toBe(true);
  });

  it("does not mark a linked provider as needing anything", () => {
    const x = build({ connectedProviders: ["x"] }).find(
      (destination) => destination.id === "x"
    );
    expect(x).toBeDefined();
    expect(x?.requiresConnection).toBeUndefined();
  });

  it("never assumes something that needs linking", () => {
    // The assumption is what "Just try it" builds, and that button must work
    // without an OAuth round trip nobody asked for.
    const destinations = build();
    expect(destinations.some((d) => d.requiresConnection)).toBe(true);
    expect(defaultDestination(destinations).requiresConnection).toBeUndefined();
  });
});

describe("defaultDestination", () => {
  it("prefers the responder, which the caller is waiting on", () => {
    expect(defaultDestination(build({ trigger: "http_request" })).id).toBe(
      "respond"
    );
  });

  it("prefers email over a widget", () => {
    // Showing a result in a tab the user has already closed is the failure
    // mode; mailing it to them is not.
    expect(defaultDestination(build()).id).toBe("email");
  });

  it("falls back to display when nothing else survives", () => {
    const displayOnly = build().filter(
      (destination) => destination.kind === "display"
    );
    expect(defaultDestination(displayOnly).id).toBe("display");
  });
});
