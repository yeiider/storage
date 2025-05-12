import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { hash } from "bcryptjs"

// IMPORTANTE: Esta ruta solo debe usarse en desarrollo para crear usuarios iniciales
// En producción, debe implementar un sistema de registro adecuado

export async function GET() {
  // Verificar que estamos en desarrollo
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Esta ruta solo está disponible en desarrollo" }, { status: 403 })
  }

  try {
    const { db } = await connectToDatabase()

    // Verificar si ya existen usuarios
    const usersCount = await db.collection("users").countDocuments()

    if (usersCount > 0) {
      return NextResponse.json({ message: "Los usuarios ya existen en la base de datos" })
    }

    // Crear usuarios de prueba
    const users = [
      {
        name: "Usuario Lectura",
        email: "lectura@ejemplo.com",
        password: await hash("password123", 10),
        role: "read",
      },
      {
        name: "Usuario Escritura",
        email: "escritura@ejemplo.com",
        password: await hash("password123", 10),
        role: "write",
      },
    ]

    await db.collection("users").insertMany(users)

    return NextResponse.json({
      message: "Usuarios creados correctamente",
      users: users.map((u) => ({ name: u.name, email: u.email, role: u.role })),
    })
  } catch (error) {
    console.error("Error al crear usuarios:", error)
    return NextResponse.json({ error: "Error al crear usuarios" }, { status: 500 })
  }
}
