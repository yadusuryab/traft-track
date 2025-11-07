/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/vision.ts
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize the client with better error handling
let client: ImageAnnotatorClient;

try {
  if (process.env.GOOGLE_VISION_API_KEY) {
    client = new ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_VISION_API_KEY,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    client = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  } else {
    // Try default credentials (for GCP environments)
    client = new ImageAnnotatorClient();
  }
} catch (error) {
  console.error('Failed to initialize Google Vision client:', error);
  // Create a mock client that will throw meaningful errors
  client = {} as ImageAnnotatorClient;
}

export interface ExtractedData {
  name?: string;
  phoneNumber?: string;
  address?: string;
  otherText?: string;
  rawText: string;
}

export async function extractTextFromImage(imageBuffer: Buffer | string): Promise<ExtractedData> {
  try {
    console.log('Starting text extraction from image...');
    
    // Handle both Buffer and base64 string inputs
    let imageContent: string;
    
    if (typeof imageBuffer === 'string') {
      // If it's already a base64 data URI, extract the base64 part
      if (imageBuffer.startsWith('data:')) {
        const base64Part = imageBuffer.split(',')[1];
        if (!base64Part) {
          throw new Error('Invalid base64 data URI format');
        }
        imageContent = base64Part;
      } else {
        // Assume it's already a pure base64 string
        imageContent = imageBuffer;
      }
    } else {
      // Convert Buffer to base64
      imageContent = imageBuffer.toString('base64');
    }

    console.log('Image content prepared for Vision API, length:', imageContent.length);

    // Check if client is properly initialized
    if (!client.textDetection) {
      throw new Error('Google Vision client not properly initialized');
    }

    const [result] = await client.textDetection({
      image: { content: imageContent },
    });

    console.log('Vision API response received:', {
      hasTextAnnotations: !!result.textAnnotations,
      annotationCount: result.textAnnotations?.length || 0
    });

    const detections = result.textAnnotations;
    let rawText = '';
    
    if (detections && detections.length > 0) {
      rawText = detections[0].description || '';
      console.log('Raw text extracted, length:', rawText.length);
    } else {
      console.log('No text detected in image');
    }

    return parseExtractedData(rawText);
  } catch (error: any) {
    console.error('Error extracting text from image:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details
    });
    
    // Return empty data but don't throw - let the upload continue
    return {
      rawText: '',
    };
  }
}

function parseExtractedData(rawText: string): ExtractedData {
  if (!rawText || rawText.trim().length === 0) {
    return { rawText: '' };
  }

  console.log('Parsing extracted text, length:', rawText.length);
  
  const lines = rawText.split('\n').filter(line => line.trim().length > 0);
  const extractedData: ExtractedData = { rawText };

  // Enhanced patterns for different data types
  const phonePattern = /(\+?(\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // Extract phone numbers
  const phoneMatches = rawText.match(phonePattern);
  if (phoneMatches && phoneMatches.length > 0) {
    extractedData.phoneNumber = phoneMatches[0].trim();
    console.log('Extracted phone number:', extractedData.phoneNumber);
  }

  // Extract email addresses
  const emailMatches = rawText.match(emailPattern);
  if (emailMatches && emailMatches.length > 0) {
    // Store first email found
    if (!extractedData.otherText) extractedData.otherText = '';
    extractedData.otherText += `Emails: ${emailMatches.join(', ')}\n`;
  }

  // Enhanced name detection
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    const words = line.split(/\s+/);
    
    // Name detection: 2-4 words, mostly title case, no digits
    if (words.length >= 2 && words.length <= 4) {
      const hasUpperCase = words.some(word => /^[A-Z][a-z]*$/.test(word));
      const hasDigits = /\d/.test(line);
      const hasCommonNameIndicators = /(mr|mrs|ms|dr|prof)\.?/i.test(words[0]);
      
      if (hasUpperCase && !hasDigits) {
        extractedData.name = line;
        console.log('Potential name found:', extractedData.name);
        break;
      }
    }
  }

  // Enhanced address detection
  const addressIndicators = [
    /\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|highway|hwy)/i,
    /(?:p\.?o\.?\s+box|p\.?o\.?\s+box|post\s+office\s+box)/i,
    /[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(-\d{4})?/,
    /\d+\s+[A-Za-z\s]+\s+(?:apt|apartment|unit|suite|ste|#)\s*\w+/i
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    for (const pattern of addressIndicators) {
      if (pattern.test(trimmedLine)) {
        extractedData.address = trimmedLine;
        console.log('Address found:', extractedData.address);
        break;
      }
    }
    if (extractedData.address) break;
  }

  // Fallback address detection - look for longer lines with numbers
  if (!extractedData.address) {
    for (const line of lines) {
      const trimmedLine = line.trim();
      const wordCount = trimmedLine.split(/\s+/).length;
      const hasNumber = /\d/.test(trimmedLine);
      
      if (wordCount >= 3 && wordCount <= 8 && hasNumber && trimmedLine.length > 15) {
        extractedData.address = trimmedLine;
        console.log('Fallback address found:', extractedData.address);
        break;
      }
    }
  }

  // Collect other relevant text
  const otherTextLines = lines.filter(line => {
    const text = line.trim();
    return text !== extractedData.name && 
           text !== extractedData.phoneNumber && 
           text !== extractedData.address &&
           text.length > 3; // Filter out very short lines
  });

  if (otherTextLines.length > 0) {
    extractedData.otherText = (extractedData.otherText || '') + otherTextLines.join('\n');
  }

  console.log('Final extracted data:', {
    hasName: !!extractedData.name,
    hasPhone: !!extractedData.phoneNumber,
    hasAddress: !!extractedData.address,
    otherTextLength: extractedData.otherText?.length || 0
  });

  return extractedData;
}

// Enhanced function with document type detection
export async function detectDocumentType(imageBuffer: Buffer | string): Promise<string> {
  try {
    console.log('Detecting document type...');
    
    // Handle both Buffer and base64 string inputs (same as extractTextFromImage)
    let imageContent: string;
    
    if (typeof imageBuffer === 'string') {
      if (imageBuffer.startsWith('data:')) {
        const base64Part = imageBuffer.split(',')[1];
        if (!base64Part) {
          throw new Error('Invalid base64 data URI format');
        }
        imageContent = base64Part;
      } else {
        imageContent = imageBuffer;
      }
    } else {
      imageContent = imageBuffer.toString('base64');
    }

    // Check if client is properly initialized
    if (!client.documentTextDetection) {
      console.warn('Google Vision client not available for document detection');
      return 'general';
    }

    const [result] = await client.documentTextDetection({
      image: { content: imageContent },
    });

    const text = result.fullTextAnnotation?.text || '';
    console.log('Document text for type detection, length:', text.length);

    // Enhanced document type detection
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('invoice') || /invoice\s*#?/i.test(text)) return 'invoice';
    if (lowerText.includes('receipt') || /receipt\s*#?/i.test(text)) return 'receipt';
    if (lowerText.includes('business card') || /business\s*card/i.test(text)) return 'business_card';
    if (lowerText.includes('license') || /driver'?s?\s*license/i.test(text)) return 'license';
    if (lowerText.includes('contract') || /agreement/i.test(text)) return 'contract';
    if (lowerText.includes('resume') || /curriculum vitae/i.test(text)) return 'resume';
    if (lowerText.includes('prescription') || /rx\s*#?/i.test(text)) return 'prescription';
    if (lowerText.includes('medical') || /patient/i.test(text)) return 'medical';
    if (lowerText.includes('bill') || /statement/i.test(text)) return 'bill';
    
    // Check for form-like documents
    if (text.includes('Form') || text.includes('FORM') || 
        text.includes('Date:') || text.includes('NAME:') || text.includes('ADDRESS:')) {
      return 'form';
    }
    
    return 'general';
  } catch (error: any) {
    console.error('Error detecting document type:', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    return 'general';
  }
}

// Test function to verify Vision API connection
export async function testVisionAPI(): Promise<boolean> {
  try {
    console.log('Testing Vision API connection...');
    
    // Create a small test image (1x1 pixel)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const [result] = await client.textDetection({
      image: { content: testImageBase64 },
    });
    
    console.log('Vision API test successful');
    return true;
  } catch (error: any) {
    console.error('Vision API test failed:', error);
    return false;
  }
}