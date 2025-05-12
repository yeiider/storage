import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { hash } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  try {
    // Obtener datos del request
    const { name, email, password, organizationName } = await request.json()

    // Validar datos
    if (!name || !email || !password || !organizationName) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar si el email ya está en uso
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "El correo electrónico ya está en uso" }, { status: 400 })
    }

    // Crear la organización
    const organizationUuid = uuidv4()
    const organizationId = uuidv4()

    const organization = {
      id: organizationId,
      name: organizationName,
      uuid: organizationUuid,
      createdAt: new Date(),
    }

    const orgResult = await db.collection("organizations").insertOne(organization)

    // Crear el usuario como owner
    const hashedPassword = await hash(password, 10)
    const userId = uuidv4()

    const user = {
      id: userId,
      name,
      email,
      password: hashedPassword,
      role: "owner",
      organizationId: organization.id,
      createdAt: new Date(),
    }

    // Actualizar la organización con el ownerId
    await db.collection("organizations").updateOne({ _id: orgResult.insertedId }, { $set: { ownerId: userId } })

    await db.collection("users").insertOne(user)

    // Crear la carpeta en S3 para la organización
    await fetch(`${request.headers.get("origin")}/api/s3/folder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Necesitamos una forma de autenticar esta solicitud sin un usuario logueado
        "X-API-Key": process.env.INTERNAL_API_KEY || "internal-api-key",
      },
      body: JSON.stringify({ key: `${organizationUuid}/` }),
    })

    return NextResponse.json({
      success: true,
      message: "Usuario y organización creados correctamente",
    })
  } catch (error) {
    console.error("Error al registrar:", error)
    return NextResponse.json({ error: "Error al registrar usuario y organización" }, { status: 500 })
  }
}
