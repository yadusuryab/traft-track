/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = (file: Buffer | string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // If it's a base64 string, upload directly
    if (typeof file === 'string' && file.startsWith('data:')) {
      cloudinary.uploader.upload(
        file,
        {
          resource_type: 'auto', // Auto-detect resource type
          folder: 'uploads',
          timeout: 60000,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary base64 upload error:', error);
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('No result from Cloudinary'));
          }
        }
      );
    } 
    // If it's a buffer, use upload_stream (backward compatibility)
    else if (file instanceof Buffer) {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'uploads',
          timeout: 60000,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary stream upload error:', error);
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('No result from Cloudinary'));
          }
        }
      );
      
      uploadStream.on('error', (error) => {
        console.error('Upload stream error:', error);
        reject(error);
      });
      
      uploadStream.end(file);
    } else {
      reject(new Error('Invalid file type. Expected Buffer or base64 string.'));
    }
  });
};