import { prisma } from "@exchange-lab/db";
import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  const body = req;
  const { email, password } = await body.json();

  if (!email || !password) {
    return NextResponse.json(
      { msg: "All Fileds Are required" },
      { status: 400 },
    );
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    //if user does not exsist in db
    if (!user) {
      return NextResponse.json({ msg: "User not found" }, { status: 404 });
    }
    //if password is wrong
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      return NextResponse.json({ msg: "Invalid credentials" }, { status: 401 });
    }

    //generate JWT here
    console.log("JWT:", process.env.JWT_SECRET);
    const token = await jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });
    const response = NextResponse.json(
      {
        msg: "Login succesful",
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 200 },
    );

    response.cookies.set("token", token, { httpOnly: true, path: "/" }); //secure: true add later
    return response;
  } catch (error) {
    return NextResponse.json(
      { msg: "Internal Server Error", error },
      { status: 500 },
    );
  }
}
