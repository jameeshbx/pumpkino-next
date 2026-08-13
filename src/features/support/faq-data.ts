export interface SupportFaq {
  category: string;
  question: string;
  answer: string;
}

// Exact copy from pumpkino-support.html's FAQS array.
export const SUPPORT_FAQS: SupportFaq[] = [
  {
    category: "Getting Started",
    question: "Do I need a credit card to start my free trial?",
    answer:
      "No. Every Travel Agency signup gets a 7-day free trial with full Growth-plan features automatically — no payment method required.",
  },
  {
    category: "Getting Started",
    question: "Is verifying my GSTIN or IATA membership required to use Pumpkino?",
    answer:
      "No. Verification is optional and can be added anytime from your Profile. It never blocks your trial, subscription, or any product feature — it only shows a verified badge to other agencies/DMCs in the marketplace.",
  },
  {
    category: "Getting Started",
    question: "Do DMCs pay to join Pumpkino?",
    answer: "No, DMC accounts are free. Subscriptions only apply to Travel Agency accounts.",
  },
  {
    category: "Billing & subscriptions",
    question: "What happens when my trial ends?",
    answer:
      "If you have not chosen a paid plan, your account automatically and softly moves to the Starter plan — your data is kept, nothing is deleted, and you can upgrade again anytime.",
  },
  {
    category: "Billing & subscriptions",
    question: "Which payment methods are supported?",
    answer:
      "Razorpay for India-billed accounts (cards, UPI, net banking) and PayPal for international accounts. You can choose either at checkout regardless of billing country.",
  },
  {
    category: "Billing & subscriptions",
    question: "Can I get a refund?",
    answer:
      "See our Refund Policy for the full details — trials are never charged, monthly plans are non-refundable mid-cycle, and annual plans have a 14-day refund window.",
  },
  {
    category: "DMC marketplace",
    question: "How do I find a new DMC to work with?",
    answer:
      "Use the Marketplace to search by destination and service type. Each listing shows verification status, ratings, and how quickly that DMC typically responds.",
  },
  {
    category: "DMC marketplace",
    question: "Can I leave a review for a DMC I have worked with?",
    answer: 'Yes — open the DMC\'s profile in the Marketplace and select "Leave a review."',
  },
  {
    category: "DMC marketplace",
    question: 'What does the "Verified" badge mean?',
    answer:
      "It means our Ops team has reviewed and confirmed that DMC's submitted business documents (registration, licenses, etc.). Unverified DMCs can still be contacted — it simply means they have not completed that optional step yet.",
  },
  {
    category: "Account & security",
    question: "I forgot my password — what do I do?",
    answer: 'Use the "Forgot password?" link on the login page to reset it via email.',
  },
  {
    category: "Account & security",
    question: "How do I change my plan?",
    answer:
      "Go to Settings → Subscription & Billing, and choose a new plan — upgrades apply immediately, downgrades apply at your next billing cycle.",
  },
];

export const SUPPORT_FAQ_CATEGORIES = Array.from(new Set(SUPPORT_FAQS.map((f) => f.category)));
