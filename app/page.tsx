import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import LoginForm from "@/components/login-form"

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const error = searchParams.error
  const success = searchParams.success

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">S3 Manager</h1>
          <p className="mt-2 text-gray-600">Inicie sesión para administrar sus archivos</p>
          {error === "auth" && (
            <p className="mt-2 text-red-600">Error de autenticación. Por favor, intente nuevamente.</p>
          )}
          {success === "registration-complete" && (
            <p className="mt-2 text-green-600">Registro completado. Inicie sesión para continuar.</p>
          )}
        </div>
        <LoginForm />
        <div className="text-center text-sm mt-4">
          ¿No tiene una cuenta?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Regístrese aquí
          </Link>
        </div>
      </div>
    </div>
  )
}
