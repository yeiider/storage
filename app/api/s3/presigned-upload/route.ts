import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPresignedUploadUrl } from "@/lib/s3"

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
    const { key, contentType, size } = await request.json()

    if (!key || !contentType) {
      return NextResponse.json({ error: "Información de archivo incompleta" }, { status: 400 })
    }

    // Verificar tamaño
    if (size > 100 * 1024 * 1024) {
      // 100MB máximo
      return NextResponse.json({ error: "El archivo excede el tamaño máximo permitido de 100MB" }, { status: 400 })
    }

    // Get presigned URL
    const presignedData = await getPresignedUploadUrl(key, contentType)

    return NextResponse.json(presignedData)
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    return NextResponse.json({ error: "Error al generar URL para carga" }, { status: 500 })
  }
}
