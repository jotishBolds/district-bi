# S3 CORS Configuration Instructions

## Manual CORS Configuration via AWS Console

1. **Go to AWS S3 Console**

   - Navigate to: https://s3.console.aws.amazon.com/
   - Select your bucket: `districtstorage`

2. **Configure CORS**
   - Click on the "Permissions" tab
   - Scroll down to "Cross-origin resource sharing (CORS)"
   - Click "Edit"
   - Replace the existing configuration with:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://*.vercel.app",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type",
      "Last-Modified"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

3. **Save Changes**
   - Click "Save changes"

## Alternative: AWS CLI Method

If you have AWS CLI configured:

```bash
aws s3api put-bucket-cors --bucket districtstorage --cors-configuration file://cors-config.json
```

Where `cors-config.json` contains the above JSON configuration.

## Fix Applied in Code

The application has been updated to:

1. **Better handle CORS in API routes** - Added proper CORS headers and OPTIONS handling
2. **Updated presigned URL generation** - Added content type and better parameters
3. **Improved file serving** - Added proper content type handling for images

## Test After CORS Configuration

1. Upload an image document to an application
2. Try to preview the image - should work without CORS errors
3. Try to download the image - should work properly
