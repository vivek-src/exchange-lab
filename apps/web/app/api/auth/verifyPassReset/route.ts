import { prisma } from "@exchange-lab/db";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { message: "Verification link missing" },
        { status: 400 },
      );
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const tokenRecord = await prisma.token.findFirst({
      where: {
        verifyToken: hashedToken,
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { message: "Invalid verification link" },
        { status: 400 },
      );
    }

    if (
      !tokenRecord.verifyTokenExp ||
      tokenRecord.verifyTokenExp < new Date()
    ) {
      return NextResponse.json(
        { message: "Link no longer valid" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verification error:", error);

    return NextResponse.json(
      { verifySuccess: false, message: "Link expired" },
      { status: 400 },
    );
  }
}
