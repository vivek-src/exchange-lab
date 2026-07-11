"use server";

import { prisma } from "@exchange-lab/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type Wallet = {
  balance: string;
  holdings: Record<string, number>;
};

export async function getWallet(): Promise<Wallet | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: session.user.id },
  });

  if (!wallet) {
    return null;
  }

  return {
    balance: wallet.balance.toString(),
    holdings: (wallet.assetsHeld ?? {}) as Record<string, number>,
  };
}
