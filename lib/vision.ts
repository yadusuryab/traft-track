// lib/vision.ts
import { ImageAnnotatorClient } from '@google-cloud/vision';

const client = process.env.GOOGLE_VISION_API_KEY 
  ? new ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_VISION_API_KEY,
    })
  : new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });


export interface ExtractedData {
  name?: string;
  phoneNumber?: string;
  address?: string;
  otherText?: string;
  rawText: string;
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<ExtractedData> {
  try {
    const [result] = await client.textDetection({
      image: { content: imageBuffer.toString('base64') },
    });

    const detections = result.textAnnotations;
    let rawText = '';
    
    if (detections && detections.length > 0) {
      rawText = detections[0].description || '';
    }

    return parseExtractedData(rawText);
  } catch (error) {
    console.error('Error extracting text from image:', error);
    return {
      rawText: '',
    };
  }
}

function parseExtractedData(rawText: string): ExtractedData {
  const lines = rawText.split('\n').filter(line => line.trim().length > 0);
  const extractedData: ExtractedData = { rawText };

  // Patterns for different data types
  const phonePattern = /(\+?(\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // Extract phone numbers
  const phoneMatches = rawText.match(phonePattern);
  if (phoneMatches && phoneMatches.length > 0) {
    extractedData.phoneNumber = phoneMatches[0].trim();
  }

  // Simple heuristics for name and address extraction
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Name detection (usually at the beginning, 2-3 words, title case)
    if (!extractedData.name && index < 3 && trimmedLine.split(/\s+/).length <= 3) {
      const words = trimmedLine.split(/\s+/);
      const hasUpperCase = words.some(word => /^[A-Z]/.test(word));
      if (hasUpperCase && words.length >= 2) {
        extractedData.name = trimmedLine;
      }
    }

    // Address detection (looks for street numbers and common address terms)
    if (!extractedData.address && (
      /\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)/i.test(trimmedLine) ||
      /(?:p\.?o\.?\s+box|p\.?o\.?\s+box)/i.test(trimmedLine) ||
      /[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}/.test(trimmedLine)
    )) {
      extractedData.address = trimmedLine;
    }
  });

  // If address not found by pattern, try to find longer lines that might be addresses
  if (!extractedData.address) {
    const potentialAddresses = lines.filter(line => {
      const wordCount = line.split(/\s+/).length;
      return wordCount >= 3 && wordCount <= 8 && line.length > 10;
    });
    if (potentialAddresses.length > 0) {
      extractedData.address = potentialAddresses[0];
    }
  }

  // Collect other relevant text (excluding already extracted fields)
  const otherTextLines = lines.filter(line => {
    const text = line.trim();
    return text !== extractedData.name && 
           text !== extractedData.phoneNumber && 
           text !== extractedData.address &&
           text.length > 0;
  });

  if (otherTextLines.length > 0) {
    extractedData.otherText = otherTextLines.join('\n');
  }

  return extractedData;
}

// Enhanced function with document type detection
export async function detectDocumentType(imageBuffer: Buffer): Promise<string> {
  try {
    const [result] = await client.documentTextDetection({
      image: { content: imageBuffer.toString('base64') },
    });

    const text = result.fullTextAnnotation?.text || '';
    
    // Simple document type detection
    if (text.includes('invoice') || text.includes('INVOICE')) return 'invoice';
    if (text.includes('receipt') || text.includes('RECEIPT')) return 'receipt';
    if (text.includes('business card') || text.includes('BUSINESS CARD')) return 'business_card';
    if (text.includes('license') || text.includes('LICENSE')) return 'license';
    if (text.includes('contract') || text.includes('CONTRACT')) return 'contract';
    
    return 'general';
  } catch (error) {
    console.error('Error detecting document type:', error);
    return 'general';
  }
}