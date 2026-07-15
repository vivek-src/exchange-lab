import { prisma } from "@exchange-lab/db";
import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { sendEmail } from "@/lib/mailer";
import { EmailType } from "@/lib/mailer";
import { pingApiNewUser } from "@/lib/utils/pingApiNewUser";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { msg: "All fields are required" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ msg: "User already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      await tx.wallet.create({
        data: {
          userId: user.id,
          balance: 50000,
          assetsHeld: {
            TATA: 50, // Allotting 50 TATA shares
            RIL: 50, // Allotting 50 RIL shares
            SOL: 50, // Allotting 50 $SOL shares
          },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: user.id,
          type: "CREDIT",
          category: "SIGNUP_BONUS",
          description: "Welcome bonus",
          amount: 50000,
          balanceAfter: 50000,
        },
      });

      // Ledger Receipt: SOL
      await tx.transaction.create({
        data: {
          walletId: user.id,
          type: "CREDIT",
          category: "SIGNUP_BONUS",
          description: "Welcome SOL coin airdrop",
          amount: 0,
          balanceAfter: 50000,
          ticker: "SOL",
          quantity: 20,
        },
      });

      // Ledger Receipt: TATA
      await tx.transaction.create({
        data: {
          walletId: user.id,
          type: "CREDIT",
          category: "SIGNUP_BONUS",
          description: "Welcome TATA airdrop",
          amount: 0,
          balanceAfter: 50000,
          ticker: "TATA",
          quantity: 20,
        },
      });

      // Ledger Receipt: RIL
      await tx.transaction.create({
        data: {
          walletId: user.id,
          type: "CREDIT",
          category: "SIGNUP_BONUS",
          description: "Welcome RIL airdrop",
          amount: 0,
          balanceAfter: 50000,
          ticker: "RIL",
          quantity: 20,
        },
      });

      await pingApiNewUser(user.id);
      return user;
    });

    //Send verification Email
    try {
      await sendEmail({
        email,
        emailType: EmailType.VERIFY,
        userId: newUser.id,
      });
    } catch (error) {
      //Continue without throwing error
      console.log("Error sending verification mail", error);
    }

    return NextResponse.json(
      { msg: "User created successfully", success: true, id: newUser.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup Error:", error);
    return NextResponse.json({ msg: "Internal Server Error" }, { status: 500 });
  }
}
