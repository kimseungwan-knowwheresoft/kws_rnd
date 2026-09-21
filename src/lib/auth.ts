import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@company.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("MISSING_CREDENTIALS");
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        
        if (!user || !user.password) {
          throw new Error("ID_NOT_FOUND");
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          const attempts = (user.failedLoginAttempts || 0) + 1;
          if (attempts >= 5) {
            const lockedUntil = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes from now
            await prisma.user.update({
              where: { id: user.id },
              data: { failedLoginAttempts: attempts, lockedUntil }
            });
            throw new Error("ACCOUNT_LOCKED_NOW");
          } else {
            await prisma.user.update({
              where: { id: user.id },
              data: { failedLoginAttempts: attempts }
            });
            throw new Error("WRONG_PASSWORD");
          }
        }

        // On successful login, reset lockout state
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null }
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
  }
};
