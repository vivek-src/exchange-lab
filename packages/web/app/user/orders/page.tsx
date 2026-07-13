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
import { ClipboardList } from "lucide-react";

const PAGE_SIZE = 10;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page ?? 1));
  const skip = (currentPage - 1) * PAGE_SIZE;

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        where: {
          category: { in: ["ORDER_BUY", "ORDER_SELL"] },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      },
    },
  });

  if (!wallet) redirect("/login");

  // Total count for pagination
  const totalOrders = await prisma.transaction.count({
    where: {
      walletId: userId,
      category: { in: ["ORDER_BUY", "ORDER_SELL"] },
    },
  });

  const totalPages = Math.ceil(totalOrders / PAGE_SIZE);
  const orders = wallet.transactions;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardList className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Your filled order history
          </p>
        </div>
      </div>

      {/* Order history */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Order History
          </h2>
          <span className="text-sm text-muted-foreground">
            {totalOrders} order{totalOrders !== 1 && "s"} total
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
            No orders yet.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-6 py-4 font-medium">Ticker</th>
                      <th className="px-6 py-4 font-medium">Side</th>
                      <th className="px-6 py-4 text-right font-medium">
                        Price
                      </th>
                      <th className="px-6 py-4 text-right font-medium">
                        Quantity
                      </th>
                      <th className="px-6 py-4 text-right font-medium">
                        Total
                      </th>
                      <th className="px-6 py-4 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="transition-colors hover:bg-muted/30">
                        <td className="px-6 py-5 font-mono font-semibold text-foreground">
                          {order.ticker ?? "—"}
                        </td>
                        <td className="px-6 py-5">
                          <Badge
                            variant="outline"
                            className={`rounded-full border-transparent px-2.5 py-1 text-xs font-medium ${
                              order.category === "ORDER_BUY"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-red-500/10 text-red-500"
                            }`}>
                            {order.category === "ORDER_BUY" ? "Buy" : "Sell"}
                          </Badge>
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-foreground">
                          ${Number(order.price ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-foreground">
                          {order.quantity ?? "—"}
                        </td>
                        <td className="px-6 py-5 text-right font-mono font-medium text-foreground">
                          ${Number(order.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-muted-foreground">
                          {order.createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
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
