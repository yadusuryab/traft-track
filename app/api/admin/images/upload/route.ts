/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/images/upload/route.ts
import { uploadToCloudinary } from '@/lib/cloudinary';
import { connectToDatabase } from '@/lib/mongodb';
import { detectDocumentType, extractTextFromImage } from '@/lib/vision';
import Image from '@/models/Image';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Test Cloudinary connection first
    const cloudinaryTest = await testCloudinaryConnection();
    if (!cloudinaryTest.success) {
      console.error('Cloudinary connection test failed:', cloudinaryTest);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Cloudinary service unavailable',
          error: process.env.NODE_ENV === 'development' ? cloudinaryTest.error : undefined
        },
        { status: 503 }
      );
    }

    await connectToDatabase();
    
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tags = (formData.get('tags') as string)?.split(',').map(tag => tag.trim()) || [];

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'File must be an image' },
        { status: 400 }
      );
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let cloudinaryResult :any;
    try {
      console.log('Uploading to Cloudinary...');
      cloudinaryResult = await uploadToCloudinary(buffer);
      console.log('Cloudinary upload successful:', cloudinaryResult.publicId);
    } catch (cloudinaryError:any) {
      console.error('Cloudinary upload failed:', cloudinaryError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to upload image to cloud storage',
          error: process.env.NODE_ENV === 'development' ? cloudinaryError.message : undefined
        },
        { status: 500 }
      );
    }

    // Rest of your processing logic...
    let extractedData:any = '';
    let documentType = 'unknown';
    
    try {
      [extractedData, documentType] = await Promise.all([
        extractTextFromImage(buffer),
        detectDocumentType(buffer)
      ]);
    } catch (visionError) {
      console.warn('Vision API processing failed:', visionError);
    }

    // Save to database
    const image = new Image({
      title,
      description,
      publicId: cloudinaryResult.publicId,
      url: cloudinaryResult.url,
      extractedData,
      documentType,
      tags,
      uploadedBy: 'admin',
    });

    await image.save();

    return NextResponse.json({
      success: true,
      message: 'Image uploaded and processed successfully',
      data: image,
    });
  } catch (error:any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Upload failed',
        error: error.message
      },
      { status: 500 }
    );
  }
}