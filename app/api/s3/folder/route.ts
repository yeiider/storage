import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createFolder } from "@/lib/s3"

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Check write permission
    if (session.user.role !== "write" && session.user.role !== "superadmin" && session.user.role !== "owner") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    // Get request body
    const { key } = await request.json()

    if (!key) {
      return NextResponse.json({ error: "Clave de carpeta no proporcionada" }, { status: 400 })
    }

    // Create folder
    await createFolder(key)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating folder:", error)
    return NextResponse.json({ error: "Error al crear carpeta" }, { status: 500 })
  }
}
