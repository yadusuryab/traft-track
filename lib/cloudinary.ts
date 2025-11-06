/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Validate and configure Cloudinary
const requiredEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY', 
  'CLOUDINARY_API_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing Cloudinary environment variables:', missingVars);
  throw new Error(`Missing Cloudinary configuration: ${missingVars.join(', ')}`);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const uploadToCloudinary = async (buffer:any) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'uploads',
        timeout: 60000, // 60 second timeout
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload stream error:', {
            message: error.message,
            http_code: error.http_code,
            name: error.name
          });
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (!result) {
          reject(new Error('Cloudinary returned empty result'));
        } else {
          resolve({
            publicId: result.public_id,
            url: result.secure_url,
          });
        }
      }
    );

    uploadStream.on('error', (error) => {
      console.error('Upload stream error:', error);
      reject(new Error(`Upload stream failed: ${error.message}`));
    });

    uploadStream.end(buffer);
  });
};

// Test function to verify Cloudinary connection
export const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    return { success: true, result };
  } catch (error:any) {
    return { 
      success: false, 
      error: error.message,
      http_code: error.http_code 
    };
  }
};