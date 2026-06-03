import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      totpEnabled: boolean;
      needsTotp: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    totpEnabled?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: string;
    totpEnabled: boolean;
    needsTotp: boolean;
    email: string;
  }
}
