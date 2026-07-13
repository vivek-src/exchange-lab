import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // your NextAuth config
import { prisma } from "@exchange-lab/db";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  // Fetch fresh user data from DB (not from JWT)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      wallet: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const walletBalance = user.wallet
    ? Number(user.wallet.balance).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      })
    : "0.00";

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Profile Header */}
      <Card className="rounded-2xl border border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-20 border border-border">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="bg-[var(--brand-cyan)]/10 text-2xl font-semibold text-[var(--brand-cyan)]">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {user.name || "User"}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Member since {memberSince}
              </p>
            </div>
            <Button variant="outline" disabled>
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Balance */}
      <Card className="rounded-2xl border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Wallet Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tracking-tight text-foreground">
            ₹{walletBalance}
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card className="rounded-2xl border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between border-b border-border py-3">
            <span className="text-sm text-muted-foreground">
              Email Verified
            </span>
            {user.emailVerified ? (
              <Badge
                variant="outline"
                className="gap-1 rounded-full border-transparent bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                <CheckCircle2 className="size-3" />
                Yes
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 rounded-full border-transparent bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
                <XCircle className="size-3" />
                No
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between border-b border-border py-3">
            <span className="text-sm text-muted-foreground">
              Account Status
            </span>
            {user.isVerified ? (
              <Badge
                variant="outline"
                className="gap-1 rounded-full border-transparent bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                <CheckCircle2 className="size-3" />
                Verified
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 rounded-full border-transparent bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500">
                <Clock className="size-3" />
                Pending
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-muted-foreground">Account ID</span>
            <span className="font-mono text-sm text-foreground">
              {user.id.slice(0, 8)}…
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
