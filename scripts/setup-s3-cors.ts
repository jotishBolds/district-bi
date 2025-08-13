import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME!;

/**
 * Configure S3 bucket CORS settings
 */
export async function configureBucketCORS(): Promise<void> {
  const corsConfiguration = {
    CORSRules: [
      {
        AllowedHeaders: ["*"],
        AllowedMethods: ["GET", "HEAD"],
        AllowedOrigins: [
          "http://localhost:3000",
          "https://*.vercel.app",
          "https://your-production-domain.com", // Update this with your actual domain
        ],
        ExposeHeaders: [
          "ETag",
          "Content-Length",
          "Content-Type",
          "Last-Modified",
        ],
        MaxAgeSeconds: 3600,
      },
    ],
  };

  const putCorsCommand = new PutBucketCorsCommand({
    Bucket: BUCKET_NAME,
    CORSConfiguration: corsConfiguration,
  });

  try {
    await s3Client.send(putCorsCommand);
    console.log("✅ S3 CORS configuration updated successfully");
  } catch (error) {
    console.error("❌ Error updating S3 CORS configuration:", error);
    throw error;
  }
}

/**
 * Get current S3 bucket CORS settings
 */
export async function getBucketCORS(): Promise<any> {
  const getCorsCommand = new GetBucketCorsCommand({
    Bucket: BUCKET_NAME,
  });

  try {
    const response = await s3Client.send(getCorsCommand);
    return response.CORSRules;
  } catch (error) {
    console.error("Error getting S3 CORS configuration:", error);
    throw error;
  }
}

// Run this script to update CORS configuration
if (require.main === module) {
  configureBucketCORS()
    .then(() => {
      console.log("CORS configuration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("CORS configuration failed:", error);
      process.exit(1);
    });
}
