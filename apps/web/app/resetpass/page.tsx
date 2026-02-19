"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ResetPassDialog } from "@/components/resetPass";
import { Button } from "@/components/ui/button";
import axios from "axios";

type Status = "loading" | "success" | "error";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      toast.error("Invalid verification link.");
      return;
    }

    const verify = async () => {
      const id = toast.loading("Verifying your link...");

      const url = `${process.env.NEXT_PUBLIC_BACKEND}/auth/resetpass?token=${token}`;
      try {
        const data = await axios.post(url);

        toast.dismiss(id);
        setStatus("success");
        toast.success("Link verified successfully");
      } catch (error: any) {
        toast.dismiss(id);
        setStatus("error");

        const message =
          error?.response?.data?.message ?? "Something went wrong.";

        setMessage(message);
        toast.error(message);
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
                <p className="text-lg font-medium">Verifying your link…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we confirm your reset link. This will only
                  take a moment.
                </p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <div>
                <p className="text-lg font-medium">
                  Link verified successfully
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your reset link is valid. You can now create a new password
                  below.
                </p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-10 w-10 text-destructive" />
              <div className="space-y-3">
                <p className="text-lg font-medium">
                  This link is no longer valid
                </p>

                <p className="text-sm text-muted-foreground">{message}</p>

                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialogOpen(true)}>
                    Resend Reset Link
                  </Button>
                  <ResetPassDialog
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
