import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { S3Client, UploadPartCommand } from "@aws-sdk/client-s3"

// Aumentamos el límite de tamaño del cuerpo de la solicitud
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}

// Initialize S3 client - Creamos una instancia única para reutilizarla
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  // Aumentamos el número máximo de conexiones para mejorar el rendimiento
  maxAttempts: 3,
})

const bucketName = process.env.AWS_BUCKET_NAME || ""

// Función para analizar el formulario multipart
async function parseMultipartForm(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const uploadId = formData.get("uploadId") as string | null
  const key = formData.get("key") as string | null
  const partNumber = formData.get("partNumber") as string | null

  if (!file || !uploadId || !key || !partNumber) {
    throw new Error("Faltan parámetros requeridos")
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  return {
    buffer,
    uploadId,
    key,
    partNumber: Number.parseInt(partNumber, 10),
  }
}

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

    // Parse the multipart form data
    const { buffer, uploadId, key, partNumber } = await parseMultipartForm(request)

    // Subir la parte a S3
    const command = new UploadPartCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: buffer,
      // Añadimos un timeout más largo para partes grandes
      ContentLength: buffer.length,
    })

    const response = await s3Client.send(command)

    return NextResponse.json({
      success: true,
      etag: response.ETag,
      partNumber,
    })
  } catch (error) {
    console.error("Error uploading part:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error al subir parte",
      },
      { status: 500 },
    )
  }
}
