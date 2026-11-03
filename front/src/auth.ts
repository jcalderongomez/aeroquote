import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { MemberRole } from "@/lib/domain";

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
        const backendUrl = process.env.BACKEND_URL;
        if (!backendUrl) throw new Error("BACKEND_URL no está configurado.");
        const response = await fetch(new URL("/api/auth/verify", backendUrl), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
          cache: "no-store",
        });
        if (response.status === 401) return null;
        if (!response.ok) throw new Error(`El servicio de autenticación respondió ${response.status}.`);
        const verifiedUser: unknown = await response.json();
        const verified = z.object({
          id: z.string(),
          name: z.string(),
          email: z.email(),
          organizationId: z.string(),
          role: z.enum(MemberRole),
        }).safeParse(verifiedUser);
        if (!verified.success) throw new Error("El backend devolvió una respuesta de autenticación inválida.");
        return {
          id: verified.data.id,
          name: verified.data.name,
          email: verified.data.email,
          organizationId: verified.data.organizationId,
          role: verified.data.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        Object.assign(token, {
          userId: user.id,
          organizationId: user.organizationId,
          role: user.role,
        });
      }
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
