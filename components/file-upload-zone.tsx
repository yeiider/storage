"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, X, FileUp, Trash2, AlertCircle } from "lucide-react"
import { FileIcon as CustomFileIcon } from "./file-preview"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Límite de tamaño de archivo en bytes (4MB)
const MAX_FILE_SIZE = 4 * 1024 * 1024

interface FileUploadZoneProps {
  onUpload: (files: File[]) => Promise<void>
  isUploading: boolean
  progress: number
  currentFile: string
}

export default function FileUploadZone({ onUpload, isUploading, progress, currentFile }: FileUploadZoneProps) {
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [errorMessage, setErrorMessage] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const validateAndAddFiles = (files: File[]) => {
    setErrorMessage("")

    const validFiles: File[] = []
    const oversizedFiles: string[] = []

    for (const file of files) {
      if (file.size <= MAX_FILE_SIZE) {
        validFiles.push(file)
      } else {
        oversizedFiles.push(file.name)
      }
    }

    if (oversizedFiles.length > 0) {
      setErrorMessage(`Los siguientes archivos exceden el límite de 4MB: ${oversizedFiles.join(", ")}`)
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles])
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files)
      validateAndAddFiles(newFiles)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      validateAndAddFiles(newFiles)
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    try {
      await onUpload(selectedFiles)
      setSelectedFiles([])
      setErrorMessage("")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron subir los archivos",
      })
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveAllFiles = () => {
    setSelectedFiles([])
    setErrorMessage("")
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {selectedFiles.length === 0 ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center text-center cursor-pointer">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Arrastra y suelta archivos aquí</h3>
            <p className="text-sm text-gray-500 mb-4">o haz clic para seleccionar archivos</p>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              <FileUp className="h-4 w-4 mr-2" />
              Seleccionar archivos
            </Button>
            <p className="text-xs text-gray-500 mt-4">Tamaño máximo: 4MB por archivo</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Archivos seleccionados ({selectedFiles.length})</h3>
            <Button variant="ghost" size="sm" onClick={handleRemoveAllFiles} disabled={isUploading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar todos
            </Button>
          </div>

          <div className="max-h-60 overflow-y-auto mb-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 mr-3 flex items-center justify-center">
                    <CustomFileIcon extension={file.name.split(".").pop() || ""} size={32} />
                  </div>
                  <div className="truncate">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(index)}
                  disabled={isUploading}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {isUploading ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Subiendo {currentFile}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-gray-500 mt-2">
                Por favor, no cierre esta ventana mientras se suben los archivos
              </p>
            </div>
          ) : (
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="h-4 w-4 mr-2" />
                Añadir más
              </Button>
              <Button onClick={handleUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Subir {selectedFiles.length} {selectedFiles.length === 1 ? "archivo" : "archivos"}
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
            </div>
          )}
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
