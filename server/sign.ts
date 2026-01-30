import { SignJWT } from "jose"

import { JwtSecrect } from "@/constants"

export async function sign(id: string) {
    const secretKey = new TextEncoder().encode(JwtSecrect)
    const token = await new SignJWT({ id }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1 day").sign(secretKey)
    return token
}
