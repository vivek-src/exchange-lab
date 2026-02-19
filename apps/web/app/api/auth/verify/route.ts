import { prisma } from "@exchange-lab/db";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ message: "Token missing" }, { status: 400 });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const tokenRecord = await prisma.token.findFirst({
      where: {
        verifyToken: hashedToken,
      },
    });

    if (!tokenRecord) {
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    if (
      !tokenRecord.verifyTokenExp ||
      tokenRecord.verifyTokenExp < new Date()
    ) {
      return NextResponse.json({ message: "Token expired" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: {
        isVerified: true,
        emailVerified: new Date(),
      },
    });

    // Delete token after verifiication
    await prisma.token.delete({
      where: { userId: tokenRecord.userId },
    });

    return NextResponse.json({ verifySuccess: true });
  } catch (error) {
    console.error("Verification error:", error);

    return NextResponse.json(
      { verifySuccess: false, message: "Token expired" },
      { status: 400 },
    );
  }
}
