import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json(
      { msg: "Logout successful", success: true },
      { status: 200 },
    );

    // Clear cookie
    response.cookies.set("token", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ msg: "Internal Server Error" }, { status: 500 });
  }
}
