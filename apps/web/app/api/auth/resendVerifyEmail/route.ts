import { prisma } from "@exchange-lab/db";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";
import { EmailType } from "@/lib/mailer";
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json(
        { message: "User already verified" },
        { status: 400 },
      );
    }

    // Send verification email again
    try {
      await sendEmail({
        email,
        emailType: EmailType.VERIFY,
        userId: newUser.id,
      });
    } catch (error) {
      console.log("Error sending verification mail", error);
    }

    return NextResponse.json(
      { message: "Verification email sent" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}
