"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ResendVerificationDialog } from "@/components/resendVerifyEmail";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const token = searchParams.get("token");
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      toast.error("Invalid verification link.");
      return;
    }

    const verify = async () => {
      const id = toast.loading("Verifying your email...");

      try {
        const res = await fetch(`/api/auth/verify?token=${token}`);
        const data = await res.json();

        toast.dismiss(id);

        if (res.ok) {
          setStatus("success");
          toast.success("Email verified successfully");

          setTimeout(() => router.push("/login"), 2500);
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed.");
          toast.error(data.message || "Verification failed.");
        }
      } catch {
        toast.dismiss(id);
        setStatus("error");
        setMessage("Something went wrong.");
        toast.error("Something went wrong.");
      }
    };

    verify();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-10 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Verifying your email</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we confirm your account.
                </p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <div>
                <p className="text-lg font-medium">Email Verified</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Redirecting you to login...
                </p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-10 w-10 text-destructive" />
              <div className="space-y-3">
                <p className="text-lg font-medium">Verification Failed</p>

                <p className="text-sm text-muted-foreground">{message}</p>

                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialogOpen(true)}>
                    Resend Verification
                  </Button>
                  <ResendVerificationDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                  />
                </>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
