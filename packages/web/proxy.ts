import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      return !!token;
    },
  },
});
export const config = {
  matcher: [
    "/user/:path*",
    // "/profile/:path*",
    // "/settings/:path*",
    // "/wallet/:path*",
    // "/trade/:path*",
  ],
};
