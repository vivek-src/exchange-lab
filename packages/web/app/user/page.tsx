import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@exchange-lab/db";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResendVerificationTrigger } from "@/components/resendVerifyEmail";
import { ResetPassTrigger } from "@/components/resetPass";
import {
  User,
  Mail,
  Wallet,
  Settings,
  Shield,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";

export default async function UserProfilePage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { email: session!.user.email },
    include: {
      wallet: true,
      accounts: {
        select: {
          provider: true,
        },
      },
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

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      {/* Profile Header Card */}
      <Card className="rounded-2xl border border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3 md:items-start">
              <Avatar className="size-24 border border-border md:size-28">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback className="bg-[var(--brand-cyan)]/10 text-3xl font-semibold text-[var(--brand-cyan)]">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div className="text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <h2 className="text-xl font-semibold text-foreground md:text-2xl">
                    {user.name || "User"}
                  </h2>
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
                      className="gap-1 rounded-full border-transparent bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      <XCircle className="size-3" />
                      Unverified
                    </Badge>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground md:justify-start">
                  <Mail className="size-4" />
                  <span className="break-all">{user.email}</span>
                </p>
                <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground md:justify-start">
                  Login Method:{" "}
                  <span className="font-medium capitalize text-foreground">
                    {user.accounts.length > 0
                      ? user.accounts[0].provider
                      : "Email"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Wallet Card */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--brand-cyan)]/10 p-2">
                <Wallet className="size-5 text-[var(--brand-cyan)]" />
              </div>
              <div>
                <CardTitle className="text-foreground">
                  Wallet Balance
                </CardTitle>
                <CardDescription>Your available funds</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-4xl font-semibold tracking-tight text-foreground">
                ₹{walletBalance}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">INR</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" disabled>
                <ExternalLink className="mr-2 size-4" />
                Deposit
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--brand-blue)]/10 p-2">
                <Shield className="size-5 text-[var(--brand-blue)]" />
              </div>
              <div>
                <CardTitle className="text-foreground">Security</CardTitle>
                <CardDescription>Account protection status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Email Verification */}
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Email Verification
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.emailVerified ? "Verified" : "Not verified"}
                  </p>
                </div>
              </div>
              {user.emailVerified ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
              ) : (
                <ResendVerificationTrigger email={user.email ?? undefined} />
              )}
            </div>

            {/* Password */}
            {user.password && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Settings className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Password
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last updated recently
                    </p>
                  </div>
                </div>
                <ResetPassTrigger
                  email={user.email ?? undefined}
                  name="Send Reset Link"
                  variant="button"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Settings Card */}
      <Card className="rounded-2xl border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Account Settings</CardTitle>
          <CardDescription>
            Manage your account preferences and data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: User,
                title: "Personal Information",
                desc: "Update your name and profile picture",
              },
              {
                icon: Shield,
                title: "Security Settings",
                desc: "Manage password and authentication",
              },
              {
                icon: Wallet,
                title: "Wallet Settings",
                desc: "Configure payment methods",
              },
              {
                icon: XCircle,
                title: "Delete Account",
                desc: "Permanently delete your account",
                danger: true,
              },
            ].map((item) => (
              <Button
                key={item.title}
                variant="outline"
                className={`h-auto justify-start border-border py-4 ${
                  item.danger ? "border-red-500/20 hover:bg-red-500/10" : ""
                }`}
                disabled>
                <div className="flex items-start gap-3 text-left">
                  <item.icon
                    className={`mt-0.5 size-5 shrink-0 ${
                      item.danger ? "text-red-500" : "text-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`font-medium ${
                        item.danger ? "text-red-500" : "text-foreground"
                      }`}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
