import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { connectToDatabase } from "@/lib/mongodb"
import { compare } from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const { db } = await connectToDatabase()
          const user = await db.collection("users").findOne({ email: credentials.email })

          if (!user) {
            console.log("Usuario no encontrado:", credentials.email)
            return null
          }

          const isPasswordValid = await compare(credentials.password, user.password)

          if (!isPasswordValid) {
            console.log("Contraseña inválida para:", credentials.email)
            return null
          }

          // Obtener información de la organización
          const organization = await db.collection("organizations").findOne({ id: user.organizationId })

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: organization?.name || "",
            organizationUuid: organization?.uuid || "",
          }
        } catch (error) {
          console.error("Error de autenticación:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
        token.organizationUuid = user.organizationUuid
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.organizationId = token.organizationId as string
        session.user.organizationName = token.organizationName as string
        session.user.organizationUuid = token.organizationUuid as string
      }
      return session
    },
  },
  pages: {
    signIn: "/",
    error: "/", // Redirigir a la página principal en caso de error
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export async function checkSuperadminExists() {
  try {
    const { db } = await connectToDatabase()
    const superadmin = await db.collection("users").findOne({ role: "superadmin" })
    return !!superadmin
  } catch (error) {
    console.error("Error al verificar superadmin:", error)
    return false
  }
}
