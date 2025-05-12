import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { hash } from "bcryptjs"
import { checkSuperadminExists } from "@/lib/auth-utils"

export async function POST(request: Request) {
  try {
    // Verificar si ya existe un superadmin
    const superadminExists = await checkSuperadminExists()

    if (superadminExists) {
      return NextResponse.json({ error: "Ya existe un usuario administrador" }, { status: 403 })
    }

    // Obtener datos del request
    const { name, email, password } = await request.json()

    // Validar datos
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar si el email ya está en uso
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "El correo electrónico ya está en uso" }, { status: 400 })
    }

    // Crear el usuario superadmin
    const hashedPassword = await hash(password, 10)
    const user = {
      name,
      email,
      password: hashedPassword,
      role: "superadmin",
      createdAt: new Date(),
    }

    await db.collection("users").insertOne(user)

    return NextResponse.json({
      success: true,
      message: "Usuario administrador creado correctamente",
    })
  } catch (error) {
    console.error("Error al crear superadmin:", error)
    return NextResponse.json({ error: "Error al crear el usuario administrador" }, { status: 500 })
  }
}
