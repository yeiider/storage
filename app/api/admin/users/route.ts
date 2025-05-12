import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { hash } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar permisos (solo owner o superadmin)
    if (session.user.role !== "owner" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    // Obtener datos del request
    const { name, email, password, role } = await request.json()

    // Validar datos
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 })
    }

    // Validar rol
    if (role !== "read" && role !== "write") {
      return NextResponse.json({ error: "Rol no válido" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar si el email ya está en uso
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "El correo electrónico ya está en uso" }, { status: 400 })
    }

    // Crear el usuario
    const hashedPassword = await hash(password, 10)
    const userId = uuidv4()

    const user = {
      id: userId,
      name,
      email,
      password: hashedPassword,
      role,
      organizationId: session.user.organizationId,
      createdAt: new Date(),
    }

    await db.collection("users").insertOne(user)

    // Devolver el usuario creado (sin la contraseña)
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      message: "Usuario creado correctamente",
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error("Error al crear usuario:", error)
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 })
  }
}
