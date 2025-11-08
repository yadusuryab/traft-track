/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/images/upload/route.ts
import { uploadToCloudinary } from '@/lib/cloudinary';
import { connectToDatabase } from '@/lib/mongodb';
import { detectDocumentType, extractTextFromImage } from '@/lib/vision';
import Image from '@/models/Image';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let cloudinaryResult: any = null;
  
  try {
    console.log('=== IMAGE UPLOAD PROCESS STARTED ===');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Timestamp:', new Date().toISOString());

    // Test database connection
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected successfully');

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tags = (formData.get('tags') as string)?.split(',').map(tag => tag.trim()) || [];

    console.log('Form data received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      title: title?.substring(0, 50),
      tagsCount: tags.length
    });

    if (!file) {
      console.error('No file uploaded');
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json(
        { success: false, message: 'File must be an image' },
        { status: 400 }
      );
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('File too large:', file.size, 'bytes');
      return NextResponse.json(
        { success: false, message: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to base64
    console.log('Converting file to base64...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Convert to base64 string
    const base64String = buffer.toString('base64');
    
    // Create data URI for Cloudinary
    const mimeType = file.type || 'image/jpeg';
    const base64Data = `data:${mimeType};base64,${base64String}`;
    
    console.log('File converted to base64, size:', {
      bufferSize: buffer.length,
      base64Size: base64String.length,
      dataUriSize: base64Data.length
    });

    // Cloudinary upload with base64
    try {
      console.log('Starting Cloudinary upload with base64...');
      cloudinaryResult = await uploadToCloudinary(base64Data);
      console.log('Cloudinary upload successful:', {
        publicId: cloudinaryResult.publicId,
        url: cloudinaryResult.url ? 'URL received' : 'No URL',
        format: cloudinaryResult.format,
        size: cloudinaryResult.bytes,
        resourceType: cloudinaryResult.resource_type
      });
    } catch (cloudinaryError: any) {
      console.error('Cloudinary upload failed:', {
        error: cloudinaryError.message,
        stack: cloudinaryError.stack,
        response: cloudinaryError.response?.body
      });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to upload image to cloud storage',
          error: process.env.NODE_ENV === 'development' ? cloudinaryError.message : 'Upload failed'
        },
        { status: 500 }
      );
    }

    // Vision API processing (still use buffer for vision APIs)
    let extractedData: any = '';
    let documentType = 'unknown';
    
    try {
      console.log('Starting Vision API processing...');
      [extractedData, documentType] = await Promise.all([
        extractTextFromImage(buffer),
        detectDocumentType(buffer)
      ]);
      console.log('Vision API processing completed:', {
        documentType,
        extractedDataLength: extractedData?.length || 0
      });
    } catch (visionError: any) {
      console.warn('Vision API processing failed:', {
        error: visionError.message,
        stack: visionError.stack
      });
      // Continue without vision data
    }

    // Save to database
    console.log('Saving to database...');
    const image = new Image({
      title,
      description,
      publicId: cloudinaryResult.publicId,
      url: cloudinaryResult.secure_url || cloudinaryResult.url,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      bytes: cloudinaryResult.bytes,
      extractedData,
      documentType,
      tags,
      uploadedBy: 'admin',
    });

    await image.save();
    console.log('Database save successful, image ID:', image._id);

    return NextResponse.json({
      success: true,
      message: 'Image uploaded and processed successfully',
      data: {
        id: image._id,
        publicId: image.publicId,
        url: image.url,
        title: image.title,
        format: image.format,
        size: image.bytes
      },
    });

  } catch (error: any) {
    console.error('=== UPLOAD PROCESS FAILED ===', {
      error: error.message,
      stack: error.stack,
      cloudinaryResult: cloudinaryResult ? {
        publicId: cloudinaryResult.publicId,
        hasUrl: !!cloudinaryResult.url,
        resourceType: cloudinaryResult.resource_type
      } : 'No cloudinary result',
      timestamp: new Date().toISOString()
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