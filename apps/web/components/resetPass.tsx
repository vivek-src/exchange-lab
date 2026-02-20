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

interface resetPassProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export function ResetPassDialog({
  open,
  onOpenChange,
  defaultEmail,
}: resetPassProps) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      await axios.post("/api/auth/sendPassReset", { email });

      toast.success("Password reset link sent to email");
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
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Enter your email and we’ll send you a link to create a new password.
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

interface resetPassTriggerProps {
  name?: string;
  email?: string;
  variant?: "button" | "link";
}

export function ResetPassTrigger({
  email,
  name,
  variant = "button",
}: ResetPassTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "button" ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          {name}
        </Button>
      ) : (
        <span
          onClick={() => setOpen(true)}
          className="text-sm text-primary hover:underline cursor-pointer">
          {name}
        </span>
      )}

      <ResetPassDialog
        open={open}
        onOpenChange={setOpen}
        defaultEmail={email}
      />
    </>
  );
}
