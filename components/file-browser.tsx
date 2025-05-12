"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Home, FolderPlus, Loader2, LayoutGrid, List, Upload } from "lucide-react"
import FileGrid from "./file-grid"
import FileList from "./file-list"
import FileUploadZone from "./file-upload-zone"
import FilePreview from "./file-preview"
import LargeFileUpload from "./large-file-upload"

interface S3Object {
  Key: string
  Size: number
  LastModified: Date
  IsFolder: boolean
  DisplayKey?: string
}

interface FileBrowserProps {
  userRole: string
  organizationUuid: string
}

// Límite para usar carga directa vs presigned URL
const DIRECT_UPLOAD_SIZE_LIMIT = 4 * 1024 * 1024 // 4MB

export default function FileBrowser({ userRole, organizationUuid }: FileBrowserProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [objects, setObjects] = useState<S3Object[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPath, setCurrentPath] = useState("")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadTab, setUploadTab] = useState<"regular" | "large">("regular")
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [currentUploadFile, setCurrentUploadFile] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [previewFile, setPreviewFile] = useState<S3Object | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Obtener el prefijo de la URL, pero asegurarse de que siempre comience con el UUID de la organización
  const rawPrefix = searchParams.get("prefix") || ""
  const prefix = rawPrefix ? `${organizationUuid}/${rawPrefix}` : `${organizationUuid}/`

  useEffect(() => {
    fetchObjects(prefix)
    setCurrentPath(rawPrefix)
  }, [prefix, organizationUuid])

  const fetchObjects = async (prefix: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/s3/list?prefix=${prefix}`)
      if (!response.ok) throw new Error("Error al cargar archivos")
      const data = await response.json()

      // Filtrar y transformar las claves para quitar el prefijo de la organización
      const filteredObjects = data.objects.map((obj: S3Object) => {
        // Quitar el prefijo de la organización para mostrar
        const displayKey = obj.Key.replace(`${organizationUuid}/`, "")
        return {
          ...obj,
          DisplayKey: displayKey || obj.Key,
        }
      })

      setObjects(filteredObjects)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los archivos",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const uploadFileDirectly = async (file: File, prefix: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      setCurrentUploadFile(file.name)
      setUploadProgress(0)

      // Crear un FormData para enviar el archivo
      const formData = new FormData()
      formData.append("file", file)
      formData.append("prefix", prefix)

      // Configurar el objeto XMLHttpRequest para seguimiento de progreso
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/s3/upload", true)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(true)
        } else {
          reject(new Error(`Error al subir ${file.name}`))
        }
      }

      xhr.onerror = () => {
        reject(new Error(`Error al subir ${file.name}`))
      }

      xhr.send(formData)
    })
  }

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return

    setIsUploading(true)

    // Construir la ruta completa con el UUID de la organización
    const fullPath = currentPath ? `${organizationUuid}/${currentPath}` : `${organizationUuid}/`

    let successCount = 0
    let errorCount = 0

    try {
      for (let i = 0; i < files.length; i++) {
        try {
          // Solo permitimos archivos de hasta 4MB
          if (files[i].size > DIRECT_UPLOAD_SIZE_LIMIT) {
            throw new Error(`El archivo ${files[i].name} excede el límite de 4MB`)
          }

          await uploadFileDirectly(files[i], fullPath)
          successCount++
        } catch (error) {
          console.error(`Error al subir ${files[i].name}:`, error)
          errorCount++
        }
      }

      // Mostrar mensaje de éxito/error
      if (successCount > 0) {
        toast({
          title: "Archivos subidos",
          description: `${successCount} de ${files.length} archivos subidos correctamente${
            errorCount > 0 ? `, ${errorCount} fallaron` : ""
          }`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo subir ningún archivo",
        })
      }

      // Cerrar el diálogo y actualizar la lista
      setUploadOpen(false)
      fetchObjects(prefix)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al subir los archivos",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleLargeFileUploadSuccess = () => {
    setUploadOpen(false)
    fetchObjects(prefix)
  }

  const handlePreview = async (file: S3Object) => {
    if (file.IsFolder) return

    try {
      // Construir la clave completa con el UUID de la organización
      const fullKey = `${organizationUuid}/${file.DisplayKey}`

      const response = await fetch(`/api/s3/download?key=${encodeURIComponent(fullKey)}`)
      if (!response.ok) throw new Error("Error al obtener URL de vista previa")

      const data = await response.json()
      setPreviewUrl(data.url)
      setPreviewFile(file)
      setIsPreviewOpen(true)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo obtener la vista previa",
      })
    }
  }

  const handleDownload = async (key: string) => {
    try {
      // Construir la clave completa con el UUID de la organización
      const fullKey = `${organizationUuid}/${key}`

      const response = await fetch(`/api/s3/download?key=${encodeURIComponent(fullKey)}`)
      if (!response.ok) throw new Error("Error al descargar archivo")

      const data = await response.json()

      // Create a temporary link to download the file
      const link = document.createElement("a")
      link.href = data.url
      link.setAttribute("download", key.split("/").pop() || "download")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el archivo",
      })
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName) return

    try {
      // Construir la ruta completa con el UUID de la organización
      const folderPath = currentPath
        ? `${organizationUuid}/${currentPath}${newFolderName}/`
        : `${organizationUuid}/${newFolderName}/`

      const response = await fetch("/api/s3/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: folderPath }),
      })

      if (!response.ok) throw new Error("Error al crear carpeta")

      toast({
        title: "Carpeta creada",
        description: "La carpeta se ha creado correctamente",
      })

      setNewFolderOpen(false)
      setNewFolderName("")
      fetchObjects(prefix)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la carpeta",
      })
    }
  }

  const handleDelete = async (key: string) => {
    if (!confirm("¿Está seguro que desea eliminar este elemento?")) return

    try {
      // Construir la clave completa con el UUID de la organización
      const fullKey = `${organizationUuid}/${key}`

      const response = await fetch("/api/s3/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: fullKey }),
      })

      if (!response.ok) throw new Error("Error al eliminar")

      toast({
        title: "Elemento eliminado",
        description: "El elemento se ha eliminado correctamente",
      })

      fetchObjects(prefix)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el elemento",
      })
    }
  }

  const navigateToFolder = (key: string) => {
    // Quitar el prefijo de la organización para la navegación
    const relativePath = key.replace(`${organizationUuid}/`, "")
    router.push(`/dashboard?prefix=${encodeURIComponent(relativePath)}`)
  }

  const navigateUp = () => {
    if (!currentPath) return

    const parts = currentPath.split("/").filter(Boolean)
    parts.pop() // Remove current folder
    const newPath = parts.length > 0 ? parts.join("/") + "/" : ""

    router.push(`/dashboard?prefix=${encodeURIComponent(newPath)}`)
  }

  const navigateHome = () => {
    router.push("/dashboard")
  }

  const getBreadcrumbs = () => {
    if (!currentPath) return [{ name: "Home", path: "" }]

    const parts = currentPath.split("/").filter(Boolean)
    let path = ""

    return [
      { name: "Home", path: "" },
      ...parts.map((part) => {
        path += part + "/"
        return { name: part, path }
      }),
    ]
  }

  const breadcrumbs = getBreadcrumbs()
  const canModify = userRole === "write" || userRole === "owner" || userRole === "superadmin"

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <BreadcrumbItem key={index}>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={`/dashboard?prefix=${encodeURIComponent(crumb.path)}`}>
                      {crumb.name}
                    </BreadcrumbLink>
                  )}
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={navigateHome} className="flex-1 sm:flex-none">
              <Home className="h-4 w-4 mr-2" />
              Inicio
            </Button>

            {currentPath && (
              <Button variant="outline" size="sm" onClick={navigateUp} className="flex-1 sm:flex-none">
                <Home className="h-4 w-4 mr-2" />
                Subir
              </Button>
            )}

            {canModify && (
              <>
                <Dialog open={uploadOpen} onOpenChange={(open) => !isUploading && setUploadOpen(open)}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex-1 sm:flex-none">
                      <Upload className="h-4 w-4 mr-2" />
                      Subir
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Subir archivos</DialogTitle>
                      <DialogDescription>
                        Seleccione los archivos que desea subir a la carpeta actual.
                      </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="regular" onValueChange={(value) => setUploadTab(value as "regular" | "large")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="regular">Archivos regulares</TabsTrigger>
                        <TabsTrigger value="large">Archivos grandes</TabsTrigger>
                      </TabsList>
                      <TabsContent value="regular" className="mt-4">
                        <div className="text-sm text-gray-500 mb-4">
                          Use esta opción para subir archivos de hasta 4MB.
                        </div>
                        <FileUploadZone
                          onUpload={handleUpload}
                          isUploading={isUploading}
                          progress={uploadProgress}
                          currentFile={currentUploadFile}
                        />
                      </TabsContent>
                      <TabsContent value="large" className="mt-4">
                        <div className="text-sm text-gray-500 mb-4">
                          Use esta opción para subir archivos de gran tamaño (hasta varios GB). El archivo se divide en
                          partes de 5MB y se puede subir a través del servidor o directamente a S3 (configurable en
                          opciones avanzadas).
                        </div>
                        <LargeFileUpload
                          prefix={currentPath ? `${organizationUuid}/${currentPath}` : `${organizationUuid}/`}
                          onSuccess={handleLargeFileUploadSuccess}
                          onCancel={() => setUploadOpen(false)}
                        />
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>

                <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Nueva carpeta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Crear carpeta</DialogTitle>
                      <DialogDescription>Ingrese el nombre de la nueva carpeta.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="name" className="text-right">
                          Nombre
                        </label>
                        <input
                          id="name"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          className="col-span-3 p-2 border rounded"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleCreateFolder} disabled={!newFolderName}>
                        Crear
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <div className="bg-gray-100 rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="px-3"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : objects.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 rounded-lg border border-dashed">
            <div className="flex flex-col items-center justify-center">
              <FolderPlus className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay archivos en esta carpeta</h3>
              {canModify && (
                <p className="text-sm text-gray-500 mb-4">Sube archivos o crea una nueva carpeta para comenzar</p>
              )}
            </div>
          </div>
        ) : (
          <div>
            {viewMode === "grid" ? (
              <FileGrid
                files={objects}
                onOpenFolder={navigateToFolder}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onDelete={handleDelete}
                canModify={canModify}
              />
            ) : (
              <FileList
                files={objects}
                onOpenFolder={navigateToFolder}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onDelete={handleDelete}
                canModify={canModify}
              />
            )}
          </div>
        )}
      </div>

      {/* Vista previa de archivos */}
      <FilePreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={previewUrl}
        fileName={previewFile?.DisplayKey?.split("/").pop() || ""}
        onDownload={() => previewFile && handleDownload(previewFile.DisplayKey || "")}
      />
    </div>
  )
}
