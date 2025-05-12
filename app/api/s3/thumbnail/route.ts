import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import type { Readable } from "stream"
import sharp from "sharp"

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

const bucketName = process.env.AWS_BUCKET_NAME || ""

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
    const width = Number.parseInt(searchParams.get("width") || "200")
    const height = Number.parseInt(searchParams.get("height") || "200")

    if (!key) {
      return NextResponse.json({ error: "Clave de objeto no proporcionada" }, { status: 400 })
    }

    // Get the file from S3
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      return NextResponse.json({ error: "No se pudo obtener el archivo" }, { status: 404 })
    }

    // Convert the readable stream to a buffer
    const chunks: Uint8Array[] = []
    const stream = response.Body as Readable

    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array)
    }

    const buffer = Buffer.concat(chunks)

    // Generate thumbnail
    const thumbnail = await sharp(buffer)
      .resize(width, height, {
        fit: "cover",
        position: "centre",
      })
      .toBuffer()

    // Return the thumbnail
    return new NextResponse(thumbnail, {
      headers: {
        "Content-Type": response.ContentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Error generating thumbnail:", error)
    return NextResponse.json({ error: "Error al generar miniatura" }, { status: 500 })
  }
}
