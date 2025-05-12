"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X, FileText, Film, Music, Code, Archive, Database, ImageIcon } from "lucide-react"

interface FilePreviewProps {
  isOpen: boolean
  onClose: () => void
  fileUrl?: string
  fileName: string
  onDownload: () => void
}

export default function FilePreview({ isOpen, onClose, fileUrl, fileName, onDownload }: FilePreviewProps) {
  const [loading, setLoading] = useState(true)
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || ""

  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileExtension)
  const isPdf = fileExtension === "pdf"
  const isVideo = ["mp4", "webm", "ogg", "mov"].includes(fileExtension)
  const isAudio = ["mp3", "wav", "ogg", "m4a"].includes(fileExtension)

  useEffect(() => {
    setLoading(isOpen)
  }, [isOpen])

  const renderPreview = () => {
    if (!fileUrl) return <div className="text-center p-8">No se puede previsualizar este archivo</div>

    if (isImage) {
      return (
        <div className="relative w-full h-[60vh] bg-black/5 rounded-md overflow-hidden">
          <Image
            src={fileUrl || "/placeholder.svg"}
            alt={fileName}
            fill
            className="object-contain"
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
          {loading && <div className="absolute inset-0 flex items-center justify-center">Cargando...</div>}
        </div>
      )
    }

    if (isPdf) {
      return (
        <iframe
          src={`${fileUrl}#toolbar=0`}
          className="w-full h-[70vh] rounded-md"
          onLoad={() => setLoading(false)}
        ></iframe>
      )
    }

    if (isVideo) {
      return (
        <video src={fileUrl} controls className="w-full max-h-[70vh] rounded-md" onLoadedData={() => setLoading(false)}>
          Tu navegador no soporta la reproducción de video.
        </video>
      )
    }

    if (isAudio) {
      return (
        <div className="w-full p-8 flex flex-col items-center justify-center">
          <Music className="w-24 h-24 text-primary mb-4" />
          <audio src={fileUrl} controls className="w-full" onLoadedData={() => setLoading(false)}>
            Tu navegador no soporta la reproducción de audio.
          </audio>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <FileIcon extension={fileExtension} size={120} />
        <p className="mt-4 text-lg font-medium">{fileName}</p>
        <p className="text-muted-foreground">Vista previa no disponible para este tipo de archivo</p>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[90vw]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="truncate max-w-[80%]">{fileName}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onDownload} title="Descargar">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={onClose} title="Cerrar">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="mt-4">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  )
}

// Componente auxiliar para mostrar iconos según la extensión del archivo
export function FileIcon({
  extension,
  size = 40,
  className = "",
}: { extension: string; size?: number; className?: string }) {
  const getFileIcon = () => {
    const iconSize = size * 0.6
    const iconClass = `text-primary ${className}`

    // Imágenes
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(extension)) {
      return <ImageIcon className={iconClass} size={iconSize} />
    }

    // Documentos
    if (["pdf", "doc", "docx", "txt", "rtf", "odt"].includes(extension)) {
      return <FileText className={iconClass} size={iconSize} />
    }

    // Videos
    if (["mp4", "webm", "avi", "mov", "wmv", "flv", "mkv"].includes(extension)) {
      return <Film className={iconClass} size={iconSize} />
    }

    // Audio
    if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(extension)) {
      return <Music className={iconClass} size={iconSize} />
    }

    // Código
    if (["html", "css", "js", "jsx", "ts", "tsx", "json", "xml", "py", "java", "php", "c", "cpp"].includes(extension)) {
      return <Code className={iconClass} size={iconSize} />
    }

    // Archivos comprimidos
    if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
      return <Archive className={iconClass} size={iconSize} />
    }

    // Bases de datos
    if (["sql", "db", "sqlite", "mdb"].includes(extension)) {
      return <Database className={iconClass} size={iconSize} />
    }

    // Por defecto
    return <FileText className={iconClass} size={iconSize} />
  }

  return (
    <div
      className={`flex items-center justify-center bg-primary/10 rounded-md ${className}`}
      style={{ width: size, height: size }}
    >
      {getFileIcon()}
    </div>
  )
}
