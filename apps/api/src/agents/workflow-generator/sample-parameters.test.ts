import { describe, expect, it } from "vitest";

import { buildSampleParameters } from "./sample-parameters";

function decode(data: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(data));
}

describe("buildSampleParameters", () => {
  it("maps the email shape onto the executor's field names", () => {
    const parameters = buildSampleParameters("email_message", {
      from: "user@example.com",
      subject: "Cannot log in",
      body: "Since the update I get a 500.",
    });

    expect(parameters).toMatchObject({
      from: "user@example.com",
      subject: "Cannot log in",
      emailBody: "Since the update I get a 500.",
    });
  });

  it("falls back to plausible email values when the model omits them", () => {
    const parameters = buildSampleParameters("email_message", undefined);
    expect(parameters.from).toBeTruthy();
    expect(parameters.emailBody).toBeTruthy();
  });

  it("encodes an http body as a BlobParameter", () => {
    const parameters = buildSampleParameters(
      "http_request",
      { method: "post", jsonBody: { name: "ada" }, query: { debug: true } },
      { apiHost: "https://api.example.com" }
    );

    expect(parameters.method).toBe("POST");
    expect(parameters.url).toBe("https://api.example.com");
    expect(parameters.query).toEqual({ debug: "true" });
    expect(parameters.body?.mimeType).toBe("application/json");
    expect(parameters.body?.data).toBeInstanceOf(Uint8Array);
    expect(decode(parameters.body!.data)).toEqual({ name: "ada" });
  });

  it("passes a form record through", () => {
    expect(
      buildSampleParameters("form_request", { formRecord: { email: "a@b.c" } })
    ).toEqual({ formRecord: { email: "a@b.c" } });
  });

  it("sends nothing for triggers the executor has no payload for", () => {
    expect(buildSampleParameters("manual", { anything: 1 })).toEqual({});
    expect(buildSampleParameters("scheduled", undefined)).toEqual({});
  });
});
