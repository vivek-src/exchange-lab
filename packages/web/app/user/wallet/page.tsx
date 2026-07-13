import { prisma } from "@exchange-lab/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

const PAGE_SIZE = 10;

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getServerSession(authOptions);

  const userId = session!.user.id;
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page ?? 1));
  const skip = (currentPage - 1) * PAGE_SIZE;

  const [wallet, transactions, totalTransactions, invested] = await Promise.all(
    [
      prisma.wallet.findUnique({
        where: { userId },
      }),
      prisma.transaction.findMany({
        where: { walletId: userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.transaction.count({
        where: { walletId: userId },
      }),
      prisma.transaction.aggregate({
        where: { walletId: userId, type: "DEBIT" },
        _sum: { amount: true },
      }),
    ],
  );

  if (!wallet) redirect("/login");

  const totalInvested = Number(invested._sum.amount ?? 0);
  const totalPages = Math.ceil(totalTransactions / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-3">
        <Wallet className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Wallet
          </h1>
          <p className="text-sm text-muted-foreground">
            Your virtual funds and transaction history
          </p>
        </div>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card px-6 py-5">
          <p className="text-sm text-muted-foreground">Available Balance</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            $
            {Number(wallet.balance).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card px-6 py-5">
          <p className="text-sm text-muted-foreground">Total Invested</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            $
            {totalInvested.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Transaction history */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Transaction History
          </h2>
          <span className="text-sm text-muted-foreground">
            {totalTransactions} transaction
            {totalTransactions !== 1 && "s"} total
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
            No transactions yet
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-6 py-4 font-medium">Description</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 text-right font-medium">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-right font-medium">
                        Balance After
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="transition-colors hover:bg-muted/30">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            {tx.type === "CREDIT" ? (
                              <ArrowDownLeft className="size-4 shrink-0 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="size-4 shrink-0 text-red-500" />
                            )}
                            {tx.description}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-muted-foreground">
                          {tx.createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-5">
                          <Badge
                            variant="outline"
                            className={`rounded-full border-transparent px-2.5 py-1 text-xs font-medium ${
                              tx.type === "CREDIT"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-red-500/10 text-red-500"
                            }`}>
                            {tx.type === "CREDIT" ? "Credit" : "Debit"}
                          </Badge>
                        </td>
                        <td
                          className={`px-6 py-5 text-right font-mono font-medium ${
                            tx.type === "CREDIT"
                              ? "text-emerald-500"
                              : "text-red-500"
                          }`}>
                          {tx.type === "CREDIT" ? "+" : "-"}$
                          {Number(tx.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-muted-foreground">
                          ${Number(tx.balanceAfter).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={`?page=${currentPage - 1}`}
                      aria-disabled={currentPage === 1}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                  <PaginationItem className="flex items-center px-4 text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href={`?page=${currentPage + 1}`}
                      aria-disabled={currentPage === totalPages}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </div>
  );
}
