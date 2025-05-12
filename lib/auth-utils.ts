import { connectToDatabase } from "@/lib/mongodb"

export async function checkSuperadminExists() {
  try {
    const { db } = await connectToDatabase()
    const superadmin = await db.collection("users").findOne({ role: "superadmin" })
    return !!superadmin
  } catch (error) {
    console.error("Error al verificar superadmin:", error)
    return false
  }
}
