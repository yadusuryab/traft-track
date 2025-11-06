// app/api/admin/images/upload/route.ts
import { uploadToCloudinary } from '@/lib/cloudinary';
import { connectToDatabase } from '@/lib/mongodb';
import { detectDocumentType, extractTextFromImage } from '@/lib/vision';
import Image from '@/models/Image';
  
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tags = (formData.get('tags') as string).split(',').map(tag => tag.trim());

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const { publicId, url } = await uploadToCloudinary(buffer);

    // Extract text and detect document type using Google Vision
    const [extractedData, documentType] = await Promise.all([
      extractTextFromImage(buffer),
      detectDocumentType(buffer)
    ]);

    // Save to database
    const image = new Image({
      title,
      description,
      publicId,
      url,
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
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Upload failed' },
      { status: 500 }
    );
  }
}