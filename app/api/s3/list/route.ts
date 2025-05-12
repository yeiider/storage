import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listObjects } from "@/lib/s3"

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Get prefix from query params
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get("prefix") || ""

    // List objects
    const objects = await listObjects(prefix)

    return NextResponse.json({ objects })
  } catch (error) {
    console.error("Error listing S3 objects:", error)
    return NextResponse.json({ error: "Error al listar objetos" }, { status: 500 })
  }
}
