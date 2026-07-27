import type { DefaultSession } from "next-auth";
// Imported for its side effect: pulls "next-auth/jwt" into the program so the
// `declare module` below actually merges with the real JWT interface.
import type { JWT as _JWT } from "next-auth/jwt";
import type { AccountType } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      accountId: string | null;
      accountType: AccountType | null;
      roles: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    accountId: string | null;
    accountType: AccountType | null;
    roles: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    accountId: string | null;
    accountType: AccountType | null;
    roles: string[];
  }
}
