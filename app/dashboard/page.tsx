import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import FileBrowser from "@/components/file-browser"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Explorador de Archivos</h1>
      <FileBrowser userRole={session?.user.role || ""} organizationUuid={session?.user.organizationUuid || ""} />
    </div>
  )
}
