import "server-only";
import type { GatewayKind } from "@prisma/client";
import { logger } from "@/shared/lib/logger";

/**
 * Payment gateway port.
 *
 * PRD Section 7 explicitly defers real Razorpay/PayPal integration; both are
 * mocked. The port keeps checkout code gateway-agnostic so the real adapters
 * (with webhooks) slot in later without touching use cases.
 */
export interface ChargeRequest {
  accountId: string;
  amount: number;
  currency: "INR" | "USD";
  description: string;
}

export interface ChargeResult {
  ok: true;
  gatewayReference: string;
}

export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

class MockGateway implements PaymentGateway {
  constructor(private readonly kind: GatewayKind) {}

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const gatewayReference = `${this.kind.toLowerCase()}_mock_${Date.now().toString(36)}`;
    logger.info("mock_gateway_charge", {
      gateway: this.kind,
      accountId: request.accountId,
      amount: request.amount,
      currency: request.currency,
      gatewayReference,
    });
    return { ok: true, gatewayReference };
  }
}

export function gatewayFor(kind: GatewayKind): PaymentGateway {
  return new MockGateway(kind);
}
