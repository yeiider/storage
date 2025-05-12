import { S3Client } from "@aws-sdk/client-s3"
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import {
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3"

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

const bucketName = process.env.AWS_BUCKET_NAME || ""

// List objects in a bucket with a specific prefix
export async function listObjects(prefix = "") {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: "/",
    })

    const response = await s3Client.send(command)

    // Process folders (CommonPrefixes)
    const folders = (response.CommonPrefixes || []).map((prefix) => ({
      Key: prefix.Prefix || "",
      Size: 0,
      LastModified: new Date(),
      IsFolder: true,
    }))

    // Process files (Contents)
    const files = (response.Contents || [])
      .filter((item) => item.Key !== prefix) // Filter out the current prefix
      .map((item) => ({
        Key: item.Key || "",
        Size: item.Size || 0,
        LastModified: item.LastModified || new Date(),
        IsFolder: false,
      }))

    return [...folders, ...files]
  } catch (error) {
    console.error("Error listing objects:", error)
    throw error
  }
}

// Upload a file directly from the server to S3
export async function uploadFile(key: string, file: Buffer, contentType: string) {
  try {
    const params: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    }

    const command = new PutObjectCommand(params)
    await s3Client.send(command)
    return true
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}

// Generate a presigned URL for downloading a file
export async function getPresignedDownloadUrl(key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour
    return url
  } catch (error) {
    console.error("Error generating download URL:", error)
    throw error
  }
}

// Create a new folder (empty object with trailing slash)
export async function createFolder(key: string) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: "",
    })

    await s3Client.send(command)
    return true
  } catch (error) {
    console.error("Error creating folder:", error)
    throw error
  }
}

// Delete an object
export async function deleteObject(key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    await s3Client.send(command)
    return true
  } catch (error) {
    console.error("Error deleting object:", error)
    throw error
  }
}

// Esta función ya no se usará, pero la mantenemos por compatibilidad
export async function getPresignedUploadUrl(key: string, contentType: string) {
  try {
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: bucketName,
      Key: key,
      Conditions: [
        ["content-length-range", 0, 100 * 1024 * 1024], // 100MB max
        ["starts-with", "$Content-Type", contentType],
      ],
      Fields: {
        "Content-Type": contentType,
      },
      Expires: 300, // 5 minutes
    })

    return { url, fields }
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    throw error
  }
}
