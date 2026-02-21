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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Profile
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your account settings
            </p>
          </div>
        </div>

        {/* Profile Header Card */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center md:items-start gap-3">
                <Avatar className="w-24 h-24 md:w-28 md:h-28 border-4 border-background shadow-lg">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* User Info */}
              <div className="flex-1 space-y-4">
                <div className="text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <h2 className="text-xl md:text-2xl font-bold">
                      {user.name || "User"}
                    </h2>
                    {user.isVerified ? (
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                    <Mail className="w-4 h-4" />
                    <span className="break-all">{user.email}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center md:justify-start gap-1">
                    Login Method:{" "}
                    <span className="font-medium capitalize">
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
        <div className="grid md:grid-cols-2 gap-6">
          {/* Wallet Card */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Wallet Balance</CardTitle>
                  <CardDescription>Your available funds</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-4xl font-bold tracking-tight">
                  ${user.wallet?.balance.toString() || "0.00"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">USD</p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" disabled>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Deposit
                </Button>
                <Button variant="outline" className="flex-1" disabled>
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Account protection status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Email Verification */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Email Verification</p>
                    <p className="text-xs text-muted-foreground">
                      {user.emailVerified ? "Verified" : "Not verified"}
                    </p>
                  </div>
                </div>
                {user.emailVerified ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                ) : (
                  // <Button size="sm" variant="outline" className="shrink-0">
                  //   Verify
                  // </Button>
                  <>
                    <ResendVerificationTrigger email={user.email} />
                  </>
                )}
              </div>

              {/* Password */}
              {user.password && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">Password</p>
                      <p className="text-xs text-muted-foreground">
                        Last updated recently
                      </p>
                    </div>
                  </div>
                  <>
                    <ResetPassTrigger
                      email=""
                      name="Send Reset Link"
                      variant="button"
                    />
                  </>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Settings Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account preferences and data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
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
                  className={`justify-start h-auto py-4 ${item.danger ? "border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950" : ""}`}
                  disabled>
                  <div className="flex items-start gap-3 text-left">
                    <item.icon
                      className={`w-5 h-5 mt-0.5 shrink-0 ${item.danger ? "text-red-600" : "text-muted-foreground"}`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`font-medium ${item.danger ? "text-red-600" : ""}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
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
    </div>
  );
}
