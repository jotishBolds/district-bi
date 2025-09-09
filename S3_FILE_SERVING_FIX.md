# S3 File Serving Fix - No More Expiration Issues

## Problem Solved

- ❌ **Before**: Files would expire after 1 hour, showing "NoSuchKey" errors
- ✅ **After**: Files are available permanently without expiration

## What Was Changed

### 1. S3 Storage Library Updates (`lib/s3-storage.ts`)

#### Extended Presigned URL Expiry

```typescript
// OLD: 1 hour expiry (3600 seconds)
export async function getPresignedUrl(key: string, expiresIn = 3600);

// NEW: 7 days expiry (604800 seconds) - Maximum allowed by S3
export async function getPresignedUrl(key: string, expiresIn = 604800);
```

#### Added Direct File Streaming Function

```typescript
// NEW: Direct file access without expiration
export async function getFileFromS3(key: string): Promise<{
  body: ReadableStream;
  contentType: string;
  contentLength: number;
  lastModified: Date;
}>;
```

### 2. New Permanent File Serving Endpoint

#### `/api/documents/[documentId]/file/route.ts` (NEW)

- **Purpose**: Serves files directly from S3 without expiration
- **Benefits**:
  - No temporary URLs
  - Permanent access
  - Server-side authorization
  - Browser caching support
  - CORS headers included

#### Usage Examples:

```javascript
// View file (inline)
GET /api/documents/123abc/file

// Download file
GET /api/documents/123abc/file?download=true

// HEAD request for metadata
HEAD /api/documents/123abc/file
```

### 3. Updated Existing Endpoints

#### `/api/documents/[documentId]/route.ts`

- Extended presigned URL expiry from 1 hour to 7 days
- Added `directUrl` field for permanent access
- Added redirect option: `?direct=true` → redirects to permanent endpoint

#### `/api/documents/[documentId]/serve/route.ts`

- Extended presigned URL expiry to 7 days
- Added redirect option for permanent serving
- Added `expiresAt` field showing when presigned URL expires

#### `/api/uploads/[...path]/route.ts`

- Extended presigned URL expiry to 7 days
- Added redirect option for permanent serving

### 4. Frontend Component Updates

#### `components/FilePreview.tsx`

```typescript
// OLD: Used temporary presigned URLs that expire
const response = await fetch(`/api/documents/${document.id}/serve`);
const data = await response.json();
setPreviewUrl(data.url);

// NEW: Uses permanent endpoint (no expiration)
const permanentUrl = `/api/documents/${document.id}/file`;
setPreviewUrl(permanentUrl);
```

## API Response Changes

### Before (with expiry):

```json
{
  "url": "https://bucket.s3.region.amazonaws.com/key?X-Amz-Expires=3600...",
  "fileName": "document.pdf",
  "fileSize": 1024,
  "documentType": "GOVERNMENT_ID"
}
```

### After (with permanent access):

```json
{
  "url": "https://bucket.s3.region.amazonaws.com/key?X-Amz-Expires=604800...",
  "directUrl": "/api/documents/123abc/file",
  "fileName": "document.pdf",
  "fileSize": 1024,
  "documentType": "GOVERNMENT_ID",
  "expiresAt": "2025-09-15T10:30:00.000Z"
}
```

## How It Works

### Permanent File Access

1. Client requests: `GET /api/documents/{id}/file`
2. Server validates user authentication & authorization
3. Server retrieves file directly from S3
4. Server streams file to client with proper headers
5. Client receives file without any expiration concerns

### Caching Strategy

- Server responses include cache headers for 1 year
- ETag support for efficient browser caching
- Files are cached based on document ID and last modified time

### Authorization

- Every request is authenticated
- Authorization checked against:
  - Admin roles
  - Officer roles
  - Application holder
  - Assigned officers
  - Frontdesk forwarding

## Migration Guide

### For Frontend Developers

```javascript
// OLD: Getting expiring URLs
const response = await fetch(`/api/documents/${id}/serve`);
const { url } = await response.json();

// NEW: Use permanent endpoints directly
const permanentUrl = `/api/documents/${id}/file`;
// Or for downloads:
const downloadUrl = `/api/documents/${id}/file?download=true`;
```

### For API Consumers

```javascript
// Option 1: Use permanent endpoint (recommended)
const fileUrl = `/api/documents/${documentId}/file`;

// Option 2: Use extended presigned URLs (7 days)
const response = await fetch(`/api/documents/${documentId}`);
const { url, directUrl, expiresAt } = await response.json();

// Option 3: Force direct serving from old endpoints
const response = await fetch(`/api/documents/${documentId}?direct=true`);
```

## Benefits

### ✅ Solved Issues

- No more "NoSuchKey" errors
- No more expired file links
- No more failed downloads after time passes
- No more broken image previews

### ✅ Improved Performance

- Server-side caching with ETags
- Reduced S3 API calls
- Better browser caching
- Streaming for large files

### ✅ Better User Experience

- Files always accessible
- Faster loading times
- Reliable downloads
- Consistent preview experience

## Security Considerations

### Authorization

- Every file access is authenticated
- Server-side authorization on each request
- No pre-signed URLs stored in client/database
- Access control maintained in real-time

### CORS

- Proper CORS headers for browser compatibility
- Supports cross-origin requests where needed
- OPTIONS preflight support

## Monitoring & Debugging

### Server Logs

- File access attempts logged
- S3 errors logged with context
- Authorization failures tracked

### Client-side

- Use browser dev tools to check response headers
- Monitor network tab for failed requests
- Check console for any errors

## Backward Compatibility

### ✅ Existing URLs Still Work

- Old presigned URL endpoints still function
- Extended expiry time (7 days vs 1 hour)
- Gradual migration path available

### ✅ API Compatibility

- All existing API responses preserved
- Additional fields added (directUrl, expiresAt)
- No breaking changes to existing clients

---

## Summary

This fix completely resolves the S3 file expiration issue by:

1. **Extending presigned URL expiry** from 1 hour to 7 days (maximum)
2. **Adding permanent file serving** through server proxy (no expiration)
3. **Updating frontend components** to use permanent endpoints
4. **Maintaining backward compatibility** with existing systems

**Result**: Files are now permanently accessible without any expiration errors! 🎉
