import { redirect } from "next/navigation"
import SetupForm from "@/components/setup-form"
import { checkSuperadminExists } from "@/lib/auth-utils"

export default async function SetupPage() {
  // Verificar si ya existe un superadmin
  const superadminExists = await checkSuperadminExists()

  // Si ya existe un superadmin, redirigir al login
  if (superadminExists) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Configuración Inicial</h1>
          <p className="mt-2 text-gray-600">Cree un usuario administrador para comenzar a usar S3 Manager</p>
        </div>
        <SetupForm />
      </div>
    </div>
  )
}
