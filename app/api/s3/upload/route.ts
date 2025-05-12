import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadFile } from "@/lib/s3"

// Aumentamos el límite de tamaño del cuerpo de la solicitud
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}

// Función para analizar el formulario multipart
async function parseMultipartForm(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const prefix = formData.get("prefix") as string | null

  if (!file) {
    throw new Error("No se proporcionó ningún archivo")
  }

  // Verificar el tamaño del archivo (4MB máximo)
  if (file.size > 4 * 1024 * 1024) {
    throw new Error("El archivo excede el tamaño máximo permitido de 4MB")
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  return {
    filename: file.name,
    contentType: file.type,
    buffer,
    prefix: prefix || "",
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
    const { filename, contentType, buffer, prefix } = await parseMultipartForm(request)

    // Generate a unique key for the file
    const key = prefix ? `${prefix}${filename}` : filename

    // Upload the file directly from the server
    await uploadFile(key, buffer, contentType)

    return NextResponse.json({
      success: true,
      message: "Archivo subido correctamente",
      key,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error al subir el archivo",
      },
      { status: 500 },
    )
  }
}
