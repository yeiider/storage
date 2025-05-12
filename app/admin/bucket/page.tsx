import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function BucketPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración del Bucket</h1>
        <p className="text-gray-500">Información y configuración del bucket de su organización</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Información del Bucket</h2>
          <p className="text-gray-500">Detalles de su bucket en S3</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Nombre de la organización</h3>
            <p className="mt-1">{session?.user.organizationName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">UUID de la organización</h3>
            <p className="mt-1">{session?.user.organizationUuid}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Ruta del bucket</h3>
            <p className="mt-1">{`${process.env.AWS_BUCKET_NAME}/${session?.user.organizationUuid}/`}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
