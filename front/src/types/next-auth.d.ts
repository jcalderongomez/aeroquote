import type { MemberRole } from "@/lib/domain";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    organizationId: string;
    role: MemberRole;
  }

  interface Session {
    user: {
      id: string;
      organizationId: string;
      role: MemberRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    organizationId: string;
    role: MemberRole;
  }
}
