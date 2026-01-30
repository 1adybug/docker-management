import { jwtVerify } from "jose"

import { JwtSecrect } from "@/constants"

export async function verify(token: unknown) {
    try {
        if (typeof token !== "string") return undefined
        token = token.trim()
        if (!token) return undefined
        const secretKey = new TextEncoder().encode(JwtSecrect)
        const {
            payload: { exp, id },
        } = await jwtVerify(token as string, secretKey)
        if (typeof exp !== "number" || typeof id !== "string" || exp < Date.now() / 1000) return undefined
        return id
    } catch (error) {
        return undefined
    }
}
