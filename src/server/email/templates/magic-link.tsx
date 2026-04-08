/* eslint-disable @next/next/no-head-element */
import * as React from "react";

interface MagicLinkEmailTemplateProps {
  url: string;
}

/**
 * Magic Link Email Template
 *
 * A clean, branded email template for authentication magic links.
 * Compatible with Resend's React email rendering.
 */
export function MagicLinkEmailTemplate({ url }: MagicLinkEmailTemplateProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sign in to AI SaaS App</title>
      </head>
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: "#f8fafc",
          margin: 0,
          padding: "40px 20px",
        }}
      >
        <table
          cellPadding="0"
          cellSpacing="0"
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
          }}
        >
          {/* Header with gradient */}
          <tr>
            <td
              style={{
                background: "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
                padding: "32px 40px",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#ffffff",
                  letterSpacing: "-0.5px",
                }}
              >
                AI SaaS App
              </h1>
            </td>
          </tr>

          {/* Content */}
          <tr>
            <td style={{ padding: "40px" }}>
              <h2
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                Sign in to your account
              </h2>

              <p
                style={{
                  margin: "0 0 24px 0",
                  fontSize: "15px",
                  lineHeight: "1.6",
                  color: "#64748b",
                }}
              >
                Click the button below to securely sign in. This link will
                expire in 15 minutes.
              </p>

              {/* CTA Button */}
              <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                <tr>
                  <td style={{ textAlign: "center", padding: "8px 0 24px 0" }}>
                    <a
                      href={url}
                      style={{
                        display: "inline-block",
                        padding: "14px 32px",
                        backgroundColor: "#0f172a",
                        color: "#ffffff",
                        fontSize: "15px",
                        fontWeight: "600",
                        textDecoration: "none",
                        borderRadius: "8px",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      Sign in to AI SaaS App
                    </a>
                  </td>
                </tr>
              </table>

              {/* Alternative link */}
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "13px",
                  color: "#94a3b8",
                }}
              >
                Or copy and paste this URL into your browser:
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#f97316",
                  wordBreak: "break-all",
                  backgroundColor: "#fef3c7",
                  padding: "12px",
                  borderRadius: "6px",
                }}
              >
                {url}
              </p>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td
              style={{
                padding: "24px 40px",
                backgroundColor: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  lineHeight: "1.6",
                  color: "#94a3b8",
                  textAlign: "center",
                }}
              >
                If you didn&apos;t request this email, you can safely ignore it.
                <br />
                This link will expire in 15 minutes for security reasons.
              </p>
            </td>
          </tr>
        </table>

        {/* Brand footer */}
        <table
          cellPadding="0"
          cellSpacing="0"
          style={{ maxWidth: "480px", margin: "24px auto 0 auto" }}
        >
          <tr>
            <td style={{ textAlign: "center" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#94a3b8",
                }}
              >
                © {new Date().getFullYear()} AI SaaS App. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

