import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME!;

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

export interface FileValidation {
  isValid: boolean;
  error?: string;
}

// File validation configuration
const ALLOWED_FILE_TYPES = {
  "image/jpeg": { extensions: [".jpg", ".jpeg"], maxSize: 5 * 1024 * 1024 }, // 5MB
  "image/png": { extensions: [".png"], maxSize: 5 * 1024 * 1024 }, // 5MB
  "image/webp": { extensions: [".webp"], maxSize: 5 * 1024 * 1024 }, // 5MB
  "application/pdf": { extensions: [".pdf"], maxSize: 10 * 1024 * 1024 }, // 10MB
};

/**
 * Validate file type and size
 */
export function validateFile(file: File): FileValidation {
  // Check file type
  if (!ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed. Only JPEG, PNG, WebP, and PDF files are permitted.`,
    };
  }

  const typeConfig =
    ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES];

  // Check file size
  if (file.size > typeConfig.maxSize) {
    const maxSizeMB = typeConfig.maxSize / (1024 * 1024);
    return {
      isValid: false,
      error: `File ${file.name} is too large. Maximum size for ${file.type} is ${maxSizeMB}MB.`,
    };
  }

  // Check file extension
  const fileExtension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf("."));
  if (!typeConfig.extensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `File extension ${fileExtension} does not match the file type ${file.type}.`,
    };
  }

  return { isValid: true };
}

/**
 * Upload file to S3
 */
export async function uploadFileToS3(
  file: File,
  applicationId: string,
  documentId: string
): Promise<UploadResult> {
  // Validate file first
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const fileExtension = file.name.substring(file.name.lastIndexOf("."));
  const key = `applications/${applicationId}/documents/${documentId}${fileExtension}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const putCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    ContentLength: file.size,
    Metadata: {
      originalName: file.name,
      applicationId: applicationId,
      documentId: documentId,
      uploadedAt: new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(putCommand);

    return {
      key,
      url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      size: file.size,
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error(`Failed to upload file: ${file.name}`);
  }
}

/**
 * Generate a presigned URL for file access (valid for 1 hour)
 */
export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
  responseContentType?: string
): Promise<string> {
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseContentType: responseContentType,
    ResponseCacheControl: "no-cache",
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn,
      // Add additional parameters to help with CORS
      signableHeaders: new Set([
        "host",
        "x-amz-content-sha256",
        "x-amz-date",
        "x-amz-algorithm",
        "x-amz-credential",
        "x-amz-expires",
        "x-amz-signedheaders",
        "x-amz-signature",
      ]),
    });
    return signedUrl;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error("Failed to generate file access URL");
  }
}

/**
 * Delete file from S3
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(deleteCommand);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error("Failed to delete file");
  }
}

/**
 * Extract S3 key from database filePath
 */
export function extractS3Key(filePath: string): string {
  // Handle both legacy local paths and S3 keys
  if (filePath.startsWith("/uploads/")) {
    // Legacy local path format: /uploads/applications/applicationId/documentId.ext
    const pathParts = filePath.split("/");
    if (pathParts.length >= 4) {
      const applicationId = pathParts[3];
      const fileName = pathParts[pathParts.length - 1];
      return `applications/${applicationId}/documents/${fileName}`;
    }
  }

  // Return as-is if it's already an S3 key
  return filePath;
}

/**
 * Get content type from file extension
 */
export function getContentTypeFromExtension(fileName: string): string {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
