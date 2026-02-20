import { prisma } from "@exchange-lab/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  console.log(token, password);
  try {
    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: "Invalid request. Please try again." },
        { status: 400 },
      );
    }

    //Verify token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const tokenRecord = await prisma.token.findFirst({
      where: {
        verifyToken: hashedToken,
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired reset link." },
        { status: 400 },
      );
    }

    if (
      !tokenRecord.verifyTokenExp ||
      tokenRecord.verifyTokenExp < new Date()
    ) {
      return NextResponse.json(
        { success: false, message: "Password reset link has expired." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: {
        id: tokenRecord.userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    // Delete token after password reset
    await prisma.token.delete({
      where: { userId: tokenRecord.userId },
    });
    return NextResponse.json(
      { success: true, message: "Your password has been reset successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Password reset error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 },
    );
  }
}
