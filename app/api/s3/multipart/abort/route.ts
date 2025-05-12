import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { S3Client, AbortMultipartUploadCommand } from "@aws-sdk/client-s3"

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

const bucketName = process.env.AWS_BUCKET_NAME || ""

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
    const { key, uploadId } = await request.json()

    if (!key || !uploadId) {
      return NextResponse.json({ error: "Información de carga incompleta" }, { status: 400 })
    }

    // Abortar carga multiparte
    const command = new AbortMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
    })

    await s3Client.send(command)

    return NextResponse.json({
      success: true,
      message: "Carga multiparte abortada correctamente",
    })
  } catch (error) {
    console.error("Error abortando carga multiparte:", error)
    return NextResponse.json({ error: "Error al abortar carga multiparte" }, { status: 500 })
  }
}
