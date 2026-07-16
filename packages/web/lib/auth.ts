import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@exchange-lab/db";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  events: {
    async createUser({ user }) {
      // console.log("createUser event triggered for:", user.id);

      await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 50000,
        },
      });
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "name@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing Email or Password");
        }
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials?.email },
          });
          //if user does not exsist in db
          if (!user) {
            throw new Error("User not found.");
          }
          //if password is wrong
          if (!user.password) {
            throw new Error("Invalid credentials");
          }
          const validPass = await bcrypt.compare(
            credentials.password,
            user.password,
          );
          if (!validPass) {
            throw new Error("Invalid credentials");
          }
          const response = {
            id: user.id,
            name: user.name,
            email: user.email,
          };
          return response;
        } catch (error: any) {
          throw new Error("Internal Server Error", error);
        }
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    signOut: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
