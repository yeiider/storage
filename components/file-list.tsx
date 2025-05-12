"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Download, Trash2, Eye, Folder, ImageIcon } from "lucide-react"
import { FileIcon } from "./file-preview"

interface FileListProps {
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

export default function FileList({ files, onOpenFolder, onPreview, onDownload, onDelete, canModify }: FileListProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[400px]">Nombre</TableHead>
            <TableHead>Tamaño</TableHead>
            <TableHead className="hidden md:table-cell">Última modificación</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => {
            const fileName = file.DisplayKey?.split("/").pop() || file.DisplayKey || ""
            const fileExtension = fileName.split(".").pop()?.toLowerCase() || ""
            const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(fileExtension)

            return (
              <TableRow key={file.Key} className="group">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    {file.IsFolder ? (
                      <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                        <Folder className="h-5 w-5 text-primary" />
                      </div>
                    ) : isImage ? (
                      <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <FileIcon extension={fileExtension} size={40} />
                    )}
                    <span
                      className={`truncate max-w-[300px] ${file.IsFolder ? "cursor-pointer hover:text-primary" : ""}`}
                      onClick={() => {
                        if (file.IsFolder) {
                          onOpenFolder(file.Key)
                        }
                      }}
                      title={fileName}
                    >
                      {fileName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{file.IsFolder ? "-" : formatFileSize(file.Size)}</TableCell>
                <TableCell className="hidden md:table-cell">{formatDate(file.LastModified)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!file.IsFolder && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => onPreview(file)} title="Vista previa">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDownload(file.DisplayKey || "")}
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {canModify && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(file.DisplayKey || "")}
                        title="Eliminar"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
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

function formatDate(date: Date): string {
  return new Date(date).toLocaleString()
}
