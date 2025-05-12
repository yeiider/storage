"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const successMessage = searchParams.get("success")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [successAlert, setSuccessAlert] = useState(
    successMessage === "setup-complete"
      ? "Usuario administrador creado correctamente. Inicie sesión para continuar."
      : "",
  )

  useEffect(() => {
    if (successAlert) {
      const timer = setTimeout(() => {
        setSuccessAlert("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successAlert])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (!result) {
        setError("Ocurrió un error al iniciar sesión. Intente nuevamente.")
        setIsLoading(false)
        return
      }

      if (result.error) {
        setError("Credenciales inválidas. Intente nuevamente.")
        setIsLoading(false)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Error de inicio de sesión:", error)
      setError("Ocurrió un error al iniciar sesión.")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successAlert && (
        <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
          <AlertDescription>{successAlert}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="correo@ejemplo.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
      </Button>
    </form>
  )
}
