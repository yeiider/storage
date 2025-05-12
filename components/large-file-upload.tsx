"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, X, FileUp, AlertCircle, Settings } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileIcon as CustomFileIcon } from "./file-preview"

// Tamaño de cada parte para S3 (5MB mínimo requerido por S3)
const CHUNK_SIZE = 5 * 1024 * 1024

// Número máximo de cargas paralelas
const MAX_CONCURRENT_UPLOADS = 3

interface LargeFileUploadProps {
  prefix: string
  onSuccess: () => void
  onCancel: () => void
}

export default function LargeFileUpload({ prefix, onSuccess, onCancel }: LargeFileUploadProps) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadedChunks, setUploadedChunks] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [uploadSpeed, setUploadSpeed] = useState<string>("Calculando...")
  const [timeRemaining, setTimeRemaining] = useState<string>("Calculando...")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)

  // Referencias para calcular velocidad y tiempo restante
  const startTimeRef = useRef<number>(0)
  const uploadedBytesRef = useRef<number>(0)
  const totalBytesRef = useRef<number>(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setErrorMessage("")

      // Calcular número total de partes
      const chunks = Math.ceil(file.size / CHUNK_SIZE)
      setTotalChunks(chunks)
      totalBytesRef.current = file.size
    }
  }

  const updateProgress = useCallback((chunkSize: number) => {
    uploadedBytesRef.current += chunkSize
    setUploadedChunks((prev) => prev + 1)

    const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000
    if (elapsedSeconds > 0) {
      // Calcular velocidad en MB/s
      const speedMBps = uploadedBytesRef.current / elapsedSeconds / (1024 * 1024)
      setUploadSpeed(`${speedMBps.toFixed(2)} MB/s`)

      // Calcular tiempo restante
      const remainingBytes = totalBytesRef.current - uploadedBytesRef.current
      const remainingSeconds = remainingBytes / (uploadedBytesRef.current / elapsedSeconds)

      if (remainingSeconds < 60) {
        setTimeRemaining(`${Math.ceil(remainingSeconds)} segundos`)
      } else if (remainingSeconds < 3600) {
        setTimeRemaining(`${Math.ceil(remainingSeconds / 60)} minutos`)
      } else {
        setTimeRemaining(`${(remainingSeconds / 3600).toFixed(1)} horas`)
      }
    }

    const newProgress = Math.round((uploadedBytesRef.current / totalBytesRef.current) * 100)
    setProgress(newProgress)
  }, [])

  // Función para obtener URL presignada para una parte
  const getPresignedUrlForPart = async (
    key: string,
    uploadId: string,
    partNumber: number,
    signal: AbortSignal,
  ): Promise<string> => {
    try {
      const response = await fetch("/api/s3/multipart/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          key,
          uploadId,
          partNumber,
        }),
        signal,
        credentials: "same-origin",
      })

      if (!response.ok) {
        throw new Error(`Error al obtener URL para parte ${partNumber}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.signedUrl
    } catch (error) {
      console.error(`Error al obtener URL para parte ${partNumber}:`, error)
      throw error
    }
  }

  // Función para subir una parte directamente a S3 usando URL presignada
  const uploadPartDirectlyToS3 = async (
    chunk: Blob,
    signedUrl: string,
    partNumber: number,
    signal: AbortSignal,
  ): Promise<{ etag: string; partNumber: number }> => {
    try {
      // Subir la parte directamente a S3 usando la URL presignada
      const response = await fetch(signedUrl, {
        method: "PUT",
        body: chunk,
        signal,
        headers: {
          "Content-Length": chunk.size.toString(),
          "Content-Type": "application/octet-stream",
          Origin: window.location.origin,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Error desconocido")
        throw new Error(`Error al subir parte ${partNumber}: ${response.statusText} - ${errorText}`)
      }

      // S3 devuelve el ETag en el header
      const etag = response.headers.get("ETag")
      if (!etag) {
        throw new Error(`No se recibió ETag para la parte ${partNumber}`)
      }

      // Actualizar progreso
      updateProgress(chunk.size)

      // Limpiar comillas del ETag si las tiene
      const cleanEtag = etag.replace(/"/g, "")

      return {
        etag: cleanEtag,
        partNumber: partNumber,
      }
    } catch (error) {
      console.error(`Error al subir parte ${partNumber} directamente a S3:`, error)
      throw error
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setIsUploading(true)
      setProgress(0)
      setUploadedChunks(0)
      uploadedBytesRef.current = 0
      startTimeRef.current = Date.now()

      // Crear un nuevo AbortController para esta carga
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      // 1. Iniciar carga multiparte
      const newKey = `${prefix}${selectedFile.name}`
      setKey(newKey)
      const initResponse = await fetch("/api/s3/multipart/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          key: newKey,
          contentType: selectedFile.type,
        }),
        signal,
        credentials: "same-origin",
      })

      if (!initResponse.ok) {
        const errorText = await initResponse.text().catch(() => "Error desconocido")
        throw new Error(`Error al iniciar la carga multiparte: ${initResponse.statusText} - ${errorText}`)
      }

      const { uploadId: newUploadId } = await initResponse.json()
      setUploadId(newUploadId)

      // 2. Dividir el archivo en partes de 5MB (requisito de S3)
      const totalParts = Math.ceil(selectedFile.size / CHUNK_SIZE)
      const parts: { PartNumber: number; ETag: string }[] = []

      // Función para procesar un lote de partes en paralelo
      const processChunkBatch = async (startIdx: number) => {
        const uploadPromises = []

        for (let i = 0; i < MAX_CONCURRENT_UPLOADS && startIdx + i <= totalParts; i++) {
          const partNumber = startIdx + i
          if (partNumber <= totalParts) {
            const start = (partNumber - 1) * CHUNK_SIZE
            const end = Math.min(partNumber * CHUNK_SIZE, selectedFile.size)
            const chunk = selectedFile.slice(start, end)

            // Obtener URL presignada y subir directamente a S3
            uploadPromises.push(
              getPresignedUrlForPart(newKey, newUploadId, partNumber, signal)
                .then((signedUrl) => uploadPartDirectlyToS3(chunk, signedUrl, partNumber, signal))
                .then((result) => {
                  parts.push({
                    PartNumber: result.partNumber,
                    ETag: result.etag,
                  })
                  return result
                }),
            )
          }
        }

        await Promise.all(uploadPromises)
      }

      // Procesar todas las partes en lotes
      for (let batchStart = 1; batchStart <= totalParts; batchStart += MAX_CONCURRENT_UPLOADS) {
        if (signal.aborted) {
          throw new Error("Carga cancelada por el usuario")
        }

        await processChunkBatch(batchStart)
      }

      if (signal.aborted) {
        throw new Error("Carga cancelada por el usuario")
      }

      // 3. Completar la carga multiparte (ordenar las partes por número)
      const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber)

      const completeResponse = await fetch("/api/s3/multipart/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          key: newKey,
          uploadId: newUploadId,
          parts: sortedParts,
        }),
        signal,
        credentials: "same-origin",
      })

      if (!completeResponse.ok) {
        const errorText = await completeResponse.text().catch(() => "Error desconocido")
        throw new Error(`Error al completar la carga multiparte: ${completeResponse.statusText} - ${errorText}`)
      }

      toast({
        title: "Archivo subido",
        description: `${selectedFile.name} se ha subido correctamente`,
      })

      setSelectedFile(null)
      onSuccess()
    } catch (error) {
      console.error("Error en carga multiparte:", error)

      // Si hay un error, intentar abortar la carga multiparte
      try {
        if (uploadId && key) {
          await fetch("/api/s3/multipart/abort", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: window.location.origin,
            },
            body: JSON.stringify({
              key: key,
              uploadId: uploadId,
            }),
            credentials: "same-origin",
          })
        }
      } catch (abortError) {
        console.error("Error al abortar carga multiparte:", abortError)
      }

      if (error instanceof Error) {
        if (error.message === "Carga cancelada por el usuario") {
          toast({
            title: "Carga cancelada",
            description: "La carga ha sido cancelada",
          })
        } else {
          setErrorMessage(error.message)
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message,
          })
        }
      }
    } finally {
      setIsUploading(false)
      abortControllerRef.current = null
    }
  }

  const handleCancel = () => {
    if (isUploading && abortControllerRef.current) {
      abortControllerRef.current.abort()
    } else {
      onCancel()
    }
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {!selectedFile ? (
        <div className="border-2 border-dashed rounded-lg p-8 transition-colors hover:border-primary/50">
          <div className="flex flex-col items-center justify-center text-center cursor-pointer">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecciona un archivo grande</h3>
            <p className="text-sm text-gray-500 mb-4">Esta opción permite subir archivos de hasta varios GB</p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="h-4 w-4 mr-2" />
              Seleccionar archivo
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 mr-3 flex items-center justify-center">
                <CustomFileIcon extension={selectedFile.name.split(".").pop() || ""} size={40} />
              </div>
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)} • {totalChunks} partes
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} disabled={isUploading}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!isUploading && (
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500 flex items-center"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="h-3 w-3 mr-1" />
                {showAdvanced ? "Ocultar información técnica" : "Mostrar información técnica"}
              </Button>

              {showAdvanced && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <p className="text-xs text-gray-700 mb-2">
                    <strong>Método de carga:</strong> URLs presignadas directas a S3
                  </p>
                  <p className="text-xs text-gray-700 mb-2">
                    <strong>Tamaño de cada parte:</strong> 5MB (mínimo requerido por S3)
                  </p>
                  <p className="text-xs text-gray-700 mb-2">
                    <strong>Cargas paralelas:</strong> {MAX_CONCURRENT_UPLOADS} partes simultáneas
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Este método utiliza URLs presignadas para subir directamente a S3, lo que proporciona mejor
                    rendimiento. Cada parte debe ser de al menos 5MB según los requisitos de S3.
                  </p>
                </div>
              )}
            </div>
          )}

          {isUploading ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span>
                  Subiendo parte {uploadedChunks} de {totalChunks}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Velocidad: {uploadSpeed}</span>
                <span>Tiempo restante: {timeRemaining}</span>
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">No cierre esta ventana durante la carga</p>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Iniciar carga
              </Button>
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
