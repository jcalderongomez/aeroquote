import { MemberRole } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.email().transform((email) => email.trim().toLowerCase()),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: {
            memberships: {
              orderBy: { createdAt: "asc" },
              where: { active: true },
              take: 1,
            },
          },
        });

        if (!user?.active || user.memberships.length === 0) return null;
        if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;

        const membership = user.memberships[0];
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: membership.organizationId,
          role: membership.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const userId = user?.id ?? token.userId;
      const organizationId = user?.organizationId ?? token.organizationId;
      if (typeof userId !== "string" || typeof organizationId !== "string") return token;

      const membership = await prisma.organizationMembership.findFirst({
        where: {
          userId,
          organizationId,
          active: true,
          user: { active: true },
        },
        select: { role: true },
      });
      if (!membership) {
        Object.assign(token, {
          userId: "",
          organizationId: "",
          role: MemberRole.OPERATOR,
        });
        return token;
      }

      Object.assign(token, {
        userId,
        organizationId,
        role: membership.role,
      });
      return token;
    },
    session({ session, token }) {
      if (!session.user) return session;
      const userId = token.userId;
      const organizationId = token.organizationId;
      const role = Object.values(MemberRole).find((candidate) => candidate === token.role);
      if (typeof userId !== "string" || typeof organizationId !== "string" || !role) return session;

      session.user.id = userId;
      session.user.organizationId = organizationId;
      session.user.role = role;
      return session;
    },
  },
});
