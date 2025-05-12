import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPresignedDownloadUrl } from "@/lib/s3"

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Get key from query params
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    if (!key) {
      return NextResponse.json({ error: "Clave de objeto no proporcionada" }, { status: 400 })
    }

    // Get presigned URL
    const url = await getPresignedDownloadUrl(key)

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Error generating download URL:", error)
    return NextResponse.json({ error: "Error al generar URL de descarga" }, { status: 500 })
  }
}
