"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Trash2, MoreHorizontal, Eye } from "lucide-react"
import { FileIcon } from "./file-preview"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface FileGridProps {
  files: Array<{
    Key: string
    Size: number
    LastModified: Date
    IsFolder: boolean
    DisplayKey?: string
  }>
  onOpenFolder: (key: string) => void
  onPreview: (file: any) => void
  onDownload: (key: string) => void
  onDelete: (key: string) => void
  canModify: boolean
}

export default function FileGrid({ files, onOpenFolder, onPreview, onDownload, onDelete, canModify }: FileGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {files.map((file) => (
        <FileGridItem
          key={file.Key}
          file={file}
          onOpenFolder={onOpenFolder}
          onPreview={onPreview}
          onDownload={onDownload}
          onDelete={onDelete}
          canModify={canModify}
        />
      ))}
    </div>
  )
}

function FileGridItem({
  file,
  onOpenFolder,
  onPreview,
  onDownload,
  onDelete,
  canModify,
}: {
  file: any
  onOpenFolder: (key: string) => void
  onPreview: (file: any) => void
  onDownload: (key: string) => void
  onDelete: (key: string) => void
  canModify: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const fileName = file.DisplayKey?.split("/").pop() || file.DisplayKey
  const fileExtension = !file.IsFolder ? fileName.split(".").pop()?.toLowerCase() || "" : ""

  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension)

  const handleClick = () => {
    if (file.IsFolder) {
      onOpenFolder(file.Key)
    } else {
      onPreview(file)
    }
  }

  return (
    <div
      className="relative group bg-white border rounded-lg overflow-hidden transition-all hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="cursor-pointer" onClick={handleClick}>
        {file.IsFolder ? (
          <div className="aspect-square bg-primary/5 flex items-center justify-center">
            <div className="w-20 h-16 bg-primary/20 rounded-md flex items-center justify-center">
              <div className="w-16 h-12 bg-primary/30 rounded-md flex items-center justify-center">
                <span className="text-xs font-medium text-primary/70 truncate px-1">{fileName}</span>
              </div>
            </div>
          </div>
        ) : isImage ? (
          <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
            <img
              src={`/api/s3/thumbnail?key=${encodeURIComponent(file.Key)}`}
              alt={fileName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Si falla la carga de la miniatura, mostrar un icono genérico
                e.currentTarget.style.display = "none"
                e.currentTarget.parentElement!.classList.add("bg-primary/5")
                const icon = document.createElement("div")
                icon.className = "flex items-center justify-center h-full"
                icon.innerHTML = `<div class="w-16 h-16"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="text-primary/70"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`
                e.currentTarget.parentElement!.appendChild(icon)
              }}
            />
          </div>
        ) : (
          <div className="aspect-square bg-primary/5 flex items-center justify-center">
            <FileIcon extension={fileExtension} size={64} />
          </div>
        )}
      </div>

      <div className="p-2">
        <p className="text-sm font-medium truncate" title={fileName}>
          {fileName}
        </p>
        {!file.IsFolder && <p className="text-xs text-gray-500">{formatFileSize(file.Size)}</p>}
      </div>

      {isHovered && (
        <div className="absolute top-2 right-2 flex gap-1">
          {!file.IsFolder && (
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-white/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation()
                onPreview(file)
              }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-white/80 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!file.IsFolder && (
                <DropdownMenuItem onClick={() => onDownload(file.DisplayKey || "")}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </DropdownMenuItem>
              )}
              {canModify && (
                <DropdownMenuItem className="text-red-600" onClick={() => onDelete(file.DisplayKey || "")}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
