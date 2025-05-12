import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import UserManagement from "@/components/user-management"

export default async function UsersPage() {
  const session = await getServerSession(authOptions)

  // Obtener usuarios de la organización
  const { db } = await connectToDatabase()
  const users = await db.collection("users").find({ organizationId: session?.user.organizationId }).toArray()

  // Convertir _id a string para poder serializarlo
  const serializedUsers = users.map((user) => ({
    ...user,
    _id: user._id.toString(),
    password: undefined, // No enviar la contraseña al cliente
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        <p className="text-gray-500">Administre los usuarios de su organización {session?.user.organizationName}</p>
      </div>
      <UserManagement users={serializedUsers} currentUserId={session?.user.id} />
    </div>
  )
}
