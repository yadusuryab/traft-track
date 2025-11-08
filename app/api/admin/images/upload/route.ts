/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/images/upload/route.ts
import { uploadToCloudinary } from '@/lib/cloudinary';
import { connectToDatabase } from '@/lib/mongodb';
import { detectDocumentType, extractTextFromImage } from '@/lib/vision';
import Image from '@/models/Image';
import { NextResponse } from 'next/server';

// Cache for frequent document types to reduce Vision API calls
const documentTypeCache = new Map();

export async function POST(request: Request) {
  let cloudinaryResult: any = null;
  
  try {
    console.log('=== IMAGE UPLOAD PROCESS STARTED ===');

    // Early validation before any processing
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tags = (formData.get('tags') as string)?.split(',').map(tag => tag.trim()) || [];

    console.log('Form data validated:', {
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      tagsCount: tags.length
    });

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type and size early
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'File must be an image' },
        { status: 400 }
      );
    }

    // Reduce max size to 5MB for cost optimization
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Connect to database only after validation
    await connectToDatabase();

    // Convert file to buffer for processing
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // **COST OPTIMIZATION: Compress image before upload if large**
    let optimizedBuffer = buffer;
    if (buffer.length > 2 * 1024 * 1024) { // If > 2MB, compress
      console.log('Compressing large image...');
      optimizedBuffer = await compressImage(buffer, file.type);
      console.log('Compression completed:', {
        original: formatBytes(buffer.length),
        compressed: formatBytes(optimizedBuffer.length),
        savings: `${Math.round((1 - optimizedBuffer.length / buffer.length) * 100)}%`
      });
    }

    // Convert to base64 for Cloudinary
    const base64String = optimizedBuffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const base64Data = `data:${mimeType};base64,${base64String}`;

    // **COST OPTIMIZATION: Use lower quality for Cloudinary**
    const cloudinaryOptions:any = {
      quality: 'auto:good', // Balanced quality vs size
      fetch_format: 'auto', // Auto-format based on content
      compression: 'auto' // Auto compression
    };

    console.log('Starting Cloudinary upload...');
    cloudinaryResult = await uploadToCloudinary(base64Data, cloudinaryOptions);
    
    console.log('Cloudinary upload successful:', {
      publicId: cloudinaryResult.publicId,
      format: cloudinaryResult.format,
      size: formatBytes(cloudinaryResult.bytes)
    });

    // **COST OPTIMIZATION: Strategic Vision API Usage**
    let extractedData :any = '';
    let documentType = 'unknown';

    // Only use Vision API for files likely to contain text (skip memes, nature photos, etc.)
    const shouldProcessWithVision = shouldProcessImage(file.name, tags, buffer.length);
    
    if (shouldProcessWithVision) {
      try {
        console.log('Starting optimized Vision API processing...');
        
        // **COST OPTIMIZATION: Use smaller image for text extraction**
        const visionBuffer = buffer.length > 1 * 1024 * 1024 ? optimizedBuffer : buffer;
        
        // **COST OPTIMIZATION: Process sequentially to avoid parallel API costs**
        extractedData = await extractTextFromImage(visionBuffer);
        
        // **COST OPTIMIZATION: Cache document type detection**
        const cacheKey = generateCacheKey(extractedData, tags);
        if (documentTypeCache.has(cacheKey)) {
          documentType = documentTypeCache.get(cacheKey);
          console.log('Using cached document type:', documentType);
        } else {
          documentType = await detectDocumentType(visionBuffer);
          // Cache for 1 hour
          documentTypeCache.set(cacheKey, documentType);
          setTimeout(() => documentTypeCache.delete(cacheKey), 60 * 60 * 1000);
        }

        console.log('Vision API processing completed:', {
          documentType,
          extractedDataLength: extractedData?.length || 0
        });

      } catch (visionError: any) {
        console.warn('Vision API processing failed, continuing without it:', visionError.message);
        // Don't fail the upload if Vision API fails
      }
    } else {
      console.log('Skipping Vision API processing based on optimization rules');
    }

    // **COST OPTIMIZATION: Minimal database payload**
    const imageData = {
      title: title?.substring(0, 100), // Limit title length
      description: description?.substring(0, 200), // Limit description
      publicId: cloudinaryResult.publicId,
      url: cloudinaryResult.secure_url || cloudinaryResult.url,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      bytes: cloudinaryResult.bytes,
      extractedData: extractedData?.substring(0, 5000), // Limit extracted text
      documentType,
      tags: tags.slice(0, 10), // Limit tags
      uploadedBy: 'admin',
      optimized: buffer.length !== optimizedBuffer.length, // Track if compressed
    };

    console.log('Saving optimized data to database...');
    const image = new Image(imageData);
    await image.save();

    return NextResponse.json({
      success: true,
      message: 'Image uploaded and processed efficiently',
      data: {
        id: image._id,
        publicId: image.publicId,
        url: image.url,
        optimized: imageData.optimized,
        size: formatBytes(image.bytes)
      },
    });

  } catch (error: any) {
    console.error('=== UPLOAD PROCESS FAILED ===', error.message);

    return NextResponse.json(
      { 
        success: false, 
        message: 'Upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// **COST OPTIMIZATION HELPER FUNCTIONS**

/**
 * Simple image compression using canvas (client-side like compression)
 */
async function compressImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  // For server-side, you might want to use a proper image processing library
  // like sharp instead. This is a simplified version.
  
  // In a real implementation, you would use:
  // const sharp = require('sharp');
  // return await sharp(buffer)
  //   .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
  //   .jpeg({ quality: 80 })
  //   .png({ compressionLevel: 8 })
  //   .toBuffer();
  
  // For now, return original if no compression library available
  console.warn('Image compression not implemented - consider adding sharp library');
  return buffer;
}

/**
 * Determine if image should be processed with Vision API to reduce costs
 */
function shouldProcessImage(fileName: string, tags: string[], fileSize: number): boolean {
  // Skip very small files (likely icons)
  if (fileSize < 10 * 1024) return false;
  
  // Skip based on file name patterns
  const skipPatterns = [
    /emoji/i, /meme/i, /icon/i, /logo/i, /background/i,
    /wallpaper/i, /nature/i, /landscape/i, /selfie/i
  ];
  
  if (skipPatterns.some(pattern => pattern.test(fileName))) {
    return false;
  }
  
  // Skip based on tags
  const skipTags = ['meme', 'nature', 'wallpaper', 'background', 'icon'];
  if (tags.some(tag => skipTags.includes(tag.toLowerCase()))) {
    return false;
  }
  
  // Process documents, screenshots, forms, etc.
  const processPatterns = [
    /document/i, /doc/i, /form/i, /invoice/i, /receipt/i,
    /screenshot/i, /scan/i, /text/i, /package/i, /shipping/i
  ];
  
  if (processPatterns.some(pattern => pattern.test(fileName))) {
    return true;
  }
  
  // Default: process medium to large files that might contain text
  return fileSize > 100 * 1024 && fileSize < 5 * 1024 * 1024;
}

/**
 * Generate cache key for document type detection
 */
function generateCacheKey(extractedData: string, tags: string[]): string {
  const textSnippet = extractedData?.substring(0, 100) || '';
  const tagKey = tags.slice(0, 3).join(',').toLowerCase();
  return `${textSnippet.length}:${tagKey}`;
}

/**
 * Format bytes for logging
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// **ADDITIONAL COST-SAVING MEASURES**

// Batch processing endpoint for multiple images
export async function processBatch(files: File[]) {
  // Process files sequentially to avoid overwhelming APIs
  const results = [];
  for (const file of files) {
    try {
      // Add delay between processing to stay within rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const formData = new FormData();
      formData.append('image', file);
      const result = await POST(new Request('', {
        method: 'POST',
        body: formData
      }));
      
      results.push(await result.json());
    } catch (error:any) {
      results.push({ success: false, error: error.message });
    }
  }
  return results;
}