/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/images/upload/route.ts
import { uploadToCloudinary } from '@/lib/cloudinary';
import { connectToDatabase } from '@/lib/mongodb';
import { detectDocumentType, extractTextFromImage } from '@/lib/vision';
import Image from '@/models/Image';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: Request) {
  let cloudinaryResult: any = null;
  
  try {
    console.log('=== IMAGE UPLOAD PROCESS STARTED ===');

    // Test database connection first
    try {
      await connectToDatabase();
      console.log('✅ Database connected successfully');
    } catch (dbError: any) {
      console.error('❌ Database connection failed:', dbError.message);
      return NextResponse.json(
        { success: false, message: 'Database connection failed' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;

    console.log('📁 Form data received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      title: title,
      description: description ? 'Provided' : 'Missing',
      tags: tags ? 'Provided' : 'Missing'
    });

    // Validate required fields
    if (!file) {
      console.error('❌ No file uploaded');
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      console.error('❌ Title is required');
      return NextResponse.json(
        { success: false, message: 'Title is required' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { success: false, message: 'File must be an image' },
        { status: 400 }
      );
    }

    console.log('🔄 Processing image file...');
    const bytess = await file.arrayBuffer();
    
    // Fix: Properly convert ArrayBuffer to Buffer
    const buffer = Buffer.from(new Uint8Array(bytess));
    
    console.log('📊 Original image size:', buffer.length, 'bytes');

    // Set max size to 1MB
    const maxSize = 1 * 1024 * 1024;
    
    // Always compress images to ensure they're under 1MB
    console.log('⚡ Compressing image to under 1MB...');
    
    let compressedBuffer = buffer;
    
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      console.log('🖼️ Image metadata:', {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length
      });

      // Progressive compression to get under 1MB
      let quality = 85;
      
      while (quality >= 50 && compressedBuffer.length > maxSize) {
        console.log(`🔄 Trying compression with quality: ${quality}%`);
        
        const compressionResult = await sharp(buffer)
          .jpeg({ 
            quality: quality,
            mozjpeg: true,
            chromaSubsampling: '4:4:4' // Better text clarity
          })
          .resize(1600, 1600, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toBuffer();
        
        console.log(`📦 Compressed to: ${compressionResult.length} bytes with quality ${quality}%`);
        
        compressedBuffer = compressionResult;
        
        // Reduce quality for next iteration if still too large
        if (compressedBuffer.length > maxSize) {
          quality -= 10;
        } else {
          break;
        }
      }
      
      console.log('✅ Final compressed size:', compressedBuffer.length, 'bytes');

    } catch (sharpError: any) {
      console.warn('⚠️ Sharp compression failed, using original:', sharpError.message);
      // If compression fails and original is still too large, return error
      if (compressedBuffer.length > maxSize) {
        console.error('❌ File too large after compression failure:', compressedBuffer.length, 'bytes');
        return NextResponse.json(
          { success: false, message: 'File is too large and could not be compressed' },
          { status: 400 }
        );
      }
    }

    // Final size check after compression
    if (compressedBuffer.length > maxSize) {
      console.error('❌ File still too large after compression:', compressedBuffer.length, 'bytes');
      return NextResponse.json(
        { 
          success: false, 
          message: `File size (${Math.round(compressedBuffer.length / 1024)}KB) exceeds 1MB limit after compression` 
        },
        { status: 400 }
      );
    }

    // Convert to base64 for Cloudinary
    const base64String = compressedBuffer.toString('base64');
    const mimeType = 'image/jpeg'; // Always use JPEG after compression
    const base64Data = `data:${mimeType};base64,${base64String}`;
    
    console.log('☁️ Uploading to Cloudinary...');
    try {
      cloudinaryResult = await uploadToCloudinary(base64Data);
      console.log('✅ Cloudinary upload successful - Full response:', JSON.stringify(cloudinaryResult, null, 2));
    } catch (cloudinaryError: any) {
      console.error('❌ Cloudinary upload failed:', cloudinaryError.message);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to upload image to cloud storage'
        },
        { status: 500 }
      );
    }

    // Debug: Check Cloudinary response structure
    console.log('🔍 Cloudinary response keys:', Object.keys(cloudinaryResult));
    
    // Extract Cloudinary fields - use the exact field names from your uploadToCloudinary function
    const publicId = cloudinaryResult.publicId; // This is the field name from your function
    const url = cloudinaryResult.url; // This is the field name from your function
    const width = cloudinaryResult.width;
    const height = cloudinaryResult.height;
    const format = cloudinaryResult.format;
    const bytes = cloudinaryResult.bytes || compressedBuffer.length;

    console.log('📋 Extracted Cloudinary data:', {
      publicId: publicId ? 'Found' : 'Missing',
      url: url ? 'Found' : 'Missing',
      width,
      height,
      format,
      bytes
    });

    // Validate required Cloudinary fields
    if (!publicId || !url) {
      console.error('❌ Missing required Cloudinary fields:', {
        publicId: !!publicId,
        url: !!url
      });
      throw new Error('Cloudinary response missing required fields');
    }

    // Vision API processing
    let extractedData: any = { rawText: '' };
    let documentType = 'general';
    
    try {
      console.log('🔍 Starting OCR processing...');
      [extractedData, documentType] = await Promise.all([
        extractTextFromImage(compressedBuffer),
        detectDocumentType(compressedBuffer)
      ]);
      console.log('✅ OCR processing completed:', {
        documentType,
        textLength: extractedData?.rawText?.length || 0
      });
    } catch (visionError: any) {
      console.warn('⚠️ Vision API processing failed:', visionError.message);
      // Continue with default values
    }

    // Parse tags
    const parsedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    // Save to database
    console.log('💾 Saving to database...');
    const image = new Image({
      title: title.trim(),
      description: description?.trim() || '',
      publicId: publicId,
      url: url,
      width: width,
      height: height,
      format: format,
      bytes: bytes,
      extractedData,
      documentType,
      tags: parsedTags,
      uploadedBy: 'admin',
    });

    await image.save();
    console.log('✅ Database save successful, image ID:', image._id);

    return NextResponse.json({
      success: true,
      message: 'Image uploaded and processed successfully',
      data: {
        id: image._id,
        publicId: image.publicId,
        url: image.url,
        title: image.title,
        format: image.format,
        size: image.bytes,
        documentType: image.documentType,
        textLength: image.extractedData?.rawText?.length || 0
      },
    });

  } catch (error: any) {
    console.error('❌ UPLOAD PROCESS FAILED:', {
      error: error.message,
      stack: error.stack,
      cloudinaryResult: cloudinaryResult ? 'Uploaded' : 'Failed'
    });

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