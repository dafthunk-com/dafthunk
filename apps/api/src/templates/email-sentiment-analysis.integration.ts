import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { ParseEmailNode } from "../nodes/email/parse-email-node";
import { ReceiveEmailNode } from "../nodes/email/receive-email-node";
import { DistilbertSst2Int8Node } from "../nodes/text/distilbert-sst-2-int8-node";

import { emailSentimentAnalysisTemplate } from "./email-sentiment-analysis";

describe("Email Sentiment Analysis Template", () => {
  it("should have correct node types defined", () => {
    expect(emailSentimentAnalysisTemplate.nodes).toHaveLength(3);
    expect(emailSentimentAnalysisTemplate.edges).toHaveLength(2);

    const nodeTypes = emailSentimentAnalysisTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("receive-email");
    expect(nodeTypes).toContain("parse-email");
    expect(nodeTypes).toContain("distilbert-sst-2-int8");
  });

  it("should execute all nodes in the template", async () => {
    // Note: mailparser is mocked in test/setup.ts, so the actual raw email content
    // doesn't affect parsing results. The mock returns fixed values.
    const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Content-Type: text/plain; charset=utf-8

Test plain text content`;

    // Execute receive email node
    const receiveEmailNode = emailSentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "email-parameters-1"
    )!;
    const receiveEmailInstance = new ReceiveEmailNode(receiveEmailNode);
    const receiveEmailResult = await receiveEmailInstance.execute({
      nodeId: receiveEmailNode.id,
      inputs: {},
      env: env as Bindings,
      emailMessage: {
        from: "sender@example.com",
        to: "recipient@example.com",
        headers: {},
        raw: rawEmail,
      },
    } as any);
    expect(receiveEmailResult.status).toBe("completed");
    expect(receiveEmailResult.outputs?.raw).toBe(rawEmail);

    // Execute parse email node
    const parseEmailNode = emailSentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "email-parser-1"
    )!;
    const parseEmailInstance = new ParseEmailNode(parseEmailNode);
    const parseEmailResult = await parseEmailInstance.execute({
      nodeId: parseEmailNode.id,
      inputs: {
        raw: receiveEmailResult.outputs?.raw,
      },
      env: env as Bindings,
    } as any);
    expect(parseEmailResult.status).toBe("completed");
    expect(parseEmailResult.outputs?.text).toBeDefined();
    // mailparser is mocked - returns "Test Subject" regardless of input
    expect(parseEmailResult.outputs?.subject).toBe("Test Subject");

    // Execute sentiment analysis node
    const sentimentNode = emailSentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "sentiment-1"
    )!;
    const sentimentInstance = new DistilbertSst2Int8Node(sentimentNode);
    const sentimentResult = await sentimentInstance.execute({
      nodeId: sentimentNode.id,
      inputs: {
        text: parseEmailResult.outputs?.text,
      },
      env: env as Bindings,
    } as any);
    expect(sentimentResult.status).toBe("completed");
    expect(sentimentResult.outputs?.positive).toBeDefined();
    expect(sentimentResult.outputs?.negative).toBeDefined();
    expect(typeof sentimentResult.outputs?.positive).toBe("number");
    expect(typeof sentimentResult.outputs?.negative).toBe("number");
  });
});
