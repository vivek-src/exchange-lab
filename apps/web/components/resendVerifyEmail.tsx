"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ResendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export function ResendVerificationDialog({
  open,
  onOpenChange,
  defaultEmail,
}: ResendDialogProps) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      await axios.post("/api/auth/resendVerifyEmail", { email });

      toast.success("Verification email sent");
      onOpenChange(false); // close dialog
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resend Verification Email</DialogTitle>
          <DialogDescription>
            Enter your email to receive a new verification link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button className="w-full" onClick={handleResend} disabled={loading}>
            {loading ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ResendTriggerProps {
  email?: string;
}

export function ResendVerificationTrigger({ email }: ResendTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Verify
      </Button>

      <ResendVerificationDialog
        open={open}
        onOpenChange={setOpen}
        defaultEmail={email}
      />
    </>
  );
}
