import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

export async function DELETE(request: Request, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId

    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar permisos (solo owner o superadmin)
    if (session.user.role !== "owner" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar que el usuario existe y pertenece a la organización
    const user = await db.collection("users").findOne({
      id: userId,
      organizationId: session.user.organizationId,
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // No permitir eliminar al propietario
    if (user.role === "owner") {
      return NextResponse.json({ error: "No se puede eliminar al propietario de la organización" }, { status: 400 })
    }

    // Eliminar el usuario
    await db.collection("users").deleteOne({ id: userId })

    return NextResponse.json({
      success: true,
      message: "Usuario eliminado correctamente",
    })
  } catch (error) {
    console.error("Error al eliminar usuario:", error)
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 })
  }
}
