import { Resend } from "resend";
import { prisma } from "@exchange-lab/db";
import crypto from "crypto";
import { EmailTemplate } from "@/lib/emails/EmailTemplate";

export enum EmailType {
  VERIFY = "VERIFY",
  RESET = "RESET",
}

const SENDER: Record<EmailType, string> = {
  [EmailType.VERIFY]: "XCHG Lab <verify@xchg.viveksahu.com>",
  [EmailType.RESET]: "XCHG Lab <reset@xchg.viveksahu.com>",
};

const ACTION_PATH: Record<EmailType, string> = {
  [EmailType.VERIFY]: "/verify",
  [EmailType.RESET]: "/resetpass",
};

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
  email,
  emailType,
  userId,
}: {
  email: string;
  emailType: EmailType;
  userId: string;
}) => {
  try {
    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await prisma.token.upsert({
      where: { userId },
      update: {
        verifyToken: hashedToken,
        verifyTokenExp: new Date(Date.now() + 1000 * 60 * 20),
      },
      create: {
        userId,
        verifyToken: hashedToken,
        verifyTokenExp: new Date(Date.now() + 1000 * 60 * 20),
      },
    });

    const actionLink = `${process.env.NEXT_PUBLIC_BASE_URL}${ACTION_PATH[emailType]}?token=${rawToken}`;

    const html = EmailTemplate({ actionLink, emailType });

    const { data, error } = await resend.emails.send({
      from: SENDER[emailType],
      to: email,
      subject:
        emailType === EmailType.VERIFY
          ? "Verify Your Email"
          : "Reset Your Password",
      html,
    });

    if (error) {
      console.error(error);
      throw new Error("Email sending failed");
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    throw new Error("Email sending failed");
  }
};
