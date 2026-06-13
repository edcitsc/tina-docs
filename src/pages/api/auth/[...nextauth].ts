import NextAuth from "next-auth";
import { buildAuthOptions } from "../../../../tina/auth";

export default NextAuth(buildAuthOptions());
