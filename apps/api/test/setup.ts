import { vi } from "vitest";

// Mock mailparser and its CommonJS dependencies
vi.mock("mailparser", () => ({
  simpleParser: vi.fn().mockResolvedValue({
    subject: "Test Subject",
    text: "Test plain text content",
    html: "<p>Test HTML content</p>",
    from: { value: [{ address: "sender@example.com", name: "Test Sender" }] },
    to: {
      value: [{ address: "recipient@example.com", name: "Test Recipient" }],
    },
    cc: null,
    bcc: null,
    replyTo: null,
    date: new Date("2024-01-01T00:00:00.000Z"),
    messageId: "<test-message-id@example.com>",
    inReplyTo: null,
    references: [],
    priority: "normal",
  }),
  ParsedMail: vi.fn(),
}));

// Mock SendGrid mail service
vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn().mockResolvedValue([
      {
        statusCode: 202,
        body: "",
        headers: {},
      },
    ]),
  },
  setApiKey: vi.fn(),
  send: vi.fn().mockResolvedValue([
    {
      statusCode: 202,
      body: "",
      headers: {},
    },
  ]),
}));

// Mock SendGrid client packages
vi.mock("@sendgrid/client", () => ({}));

// Mock Twilio package
vi.mock("twilio", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: "SM1234567890",
        status: "queued",
      }),
    },
  })),
  Twilio: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: "SM1234567890",
        status: "queued",
      }),
    },
  })),
}));

// Mock the problematic CommonJS dependencies
vi.mock("encoding-japanese", () => ({}));
vi.mock("libmime", () => ({}));
vi.mock("mailsplit", () => ({}));
