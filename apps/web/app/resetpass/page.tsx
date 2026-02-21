"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ResetPassDialog } from "@/components/resetPass";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type Status = "loading" | "success" | "error";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPass: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
  })
  .refine((data) => data.password === data.confirmPass, {
    message: "Passwords do not match",
    path: ["confirmPass"], // error shows under confirmPass field
  });

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof passwordSchema>>({
    defaultValues: {
      password: "",
      confirmPass: "",
    },
    resolver: zodResolver(passwordSchema),
    mode: "onChange",
  });

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      toast.error("Invalid verification link.");
      return;
    }

    const verify = async () => {
      const id = toast.loading("Verifying your link...");
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/verifyPassReset`,
          {}, //Empty Body
          {
            params: {
              token: token,
            },
          },
        );
        toast.dismiss(id);
        if (res.data?.success) {
          setStatus("success");
          toast.success("Link verified successfully");
        } else {
          setStatus("error");
          const message = "Verification failed.";
          setMessage(message);
          toast.error(message);
        }
      } catch (error: any) {
        console.log("FULL ERROR:", error);
        toast.dismiss(id);
        setStatus("error");

        const message =
          error?.response?.data?.message ?? "Something went wrong.";

        setMessage(message);
        toast.error(message);
      }
    };
    verify();
  }, []);

  //Set New Password
  const onSubmit = async (data: z.infer<typeof passwordSchema>) => {
    setLoading(true);
    try {
      console.log("Sending:", { token, password: data.password });
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/resetPass`,
        {
          token,
          password: data.password,
        },
      );
      if (res.status === 200) {
        toast.success("Password reset succesful.", {
          description: "You can now log in with your new password.",
        });

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error: any) {
      if (error.response) {
        setMessage(error.response?.data?.message);
        toast.error(error.response?.data?.message);
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
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
                <p className="text-sm text-muted-foreground mt-1 pb-5">
                  Your reset link is valid. You can now create a new password
                  below.
                </p>
                <Separator />
                <Form {...form}>
                  <form
                    className="space-y-4 pt-7"
                    onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Create a new password"
                              type="password"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Create a new password"
                              type="password"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button className="w-full" type="submit" disabled={loading}>
                      {loading && <Spinner className="mr-2 h-4 w-4" />}
                      Reset Password
                    </Button>
                  </form>
                </Form>
              </div>
              <CardFooter className="flex flex-col space-y-4">
                <div className="text-center text-base text-muted-foreground">
                  {message && <p className={"text-red-500"}>{message}</p>}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Remember Your Password?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-primary underline-offset-4 hover:underline">
                    Sign in
                  </Link>
                </div>

                <div className="text-center text-xs text-muted-foreground">
                  Make sure your new password is strong and not used elsewhere.
                </div>
              </CardFooter>
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
