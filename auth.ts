import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import type { PortalRole, UserRole } from "@/lib/auth/types";
import { isPortalRole } from "@/lib/auth/types";
import { portalRolesFromUser } from "@/lib/auth/user-roles";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
      roles: PortalRole[];
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    roles?: PortalRole[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const emailRaw = credentials?.email;
        const passwordRaw = credentials?.password;
        if (!emailRaw || !passwordRaw || typeof emailRaw !== "string") {
          return null;
        }
        const email = emailRaw.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await compare(String(passwordRaw), user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          roles: portalRolesFromUser(user),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
        token.roles = (user as { roles?: PortalRole[] }).roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        const tr = token.roles as PortalRole[] | undefined;
        session.user.roles =
          Array.isArray(tr) && tr.length > 0
            ? tr
            : isPortalRole(token.role as UserRole)
              ? [token.role as PortalRole]
              : [];
      }
      return session;
    },
  },
});
