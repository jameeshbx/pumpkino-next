import "server-only";
import { logger } from "@/shared/lib/logger";

/**
 * Mailer port. The prototype has no email provider, so the default adapter
 * logs the message (dev-friendly: reset links appear in the server console).
 * Swap `consoleMailer` for an SMTP/SES adapter without touching callers.
 */
export interface Mailer {
  send(message: { to: string; subject: string; text: string }): Promise<void>;
}

const consoleMailer: Mailer = {
  async send(message) {
    logger.info("email_sent (console adapter)", {
      to: message.to,
      subject: message.subject,
      // Body logged in dev only — contains tokenised links.
      ...(process.env.NODE_ENV !== "production" ? { text: message.text } : {}),
    });
  },
};

export const mailer: Mailer = consoleMailer;
