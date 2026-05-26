import { DefaultSession, DefaultUser } from "next-auth";
import { UserRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: UserRole;
  }
}
