/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/vision.ts - Using REST API instead of client library
export interface ExtractedData {
  name?: string;
  phoneNumber?: string;
  address?: string;
  otherText?: string;
  rawText: string;
}

async function callVisionAPI(base64Image: string, featureType: 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION' = 'TEXT_DETECTION'): Promise<any> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY environment variable is required');
  }

  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  
  const requestBody = {
    requests: [
      {
        image: {
          content: base64Image,
        },
        features: [
          {
            type: featureType,
            maxResults: 1,
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

export async function extractTextFromImage(imageBuffer: Buffer | string): Promise<ExtractedData> {
  try {
    console.log('Starting text extraction from image...');
    
    // Handle both Buffer and base64 string inputs
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

    console.log('Calling Vision API via REST...');
    const result = await callVisionAPI(imageContent, 'TEXT_DETECTION');

    const textAnnotations = result.responses?.[0]?.textAnnotations;
    let rawText = '';
    
    if (textAnnotations && textAnnotations.length > 0) {
      rawText = textAnnotations[0].description || '';
      console.log('Raw text extracted, length:', rawText.length);
    } else {
      console.log('No text detected in image');
    }

    return parseExtractedData(rawText);
  } catch (error: any) {
    console.error('Error extracting text from image:', {
      error: error.message,
      stack: error.stack
    });
    
    return {
      rawText: '',
    };
  }
}

export async function detectDocumentType(imageBuffer: Buffer | string): Promise<string> {
  try {
    console.log('Detecting document type...');
    
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

    const result = await callVisionAPI(imageContent, 'DOCUMENT_TEXT_DETECTION');
    const text = result.responses?.[0]?.fullTextAnnotation?.text || '';
    
    console.log('Document text for type detection, length:', text.length);

    // Document type detection
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('invoice')) return 'invoice';
    if (lowerText.includes('receipt')) return 'receipt';
    if (lowerText.includes('business card')) return 'business_card';
    if (lowerText.includes('license')) return 'license';
    if (lowerText.includes('contract')) return 'contract';
    if (lowerText.includes('resume')) return 'resume';
    if (lowerText.includes('prescription')) return 'prescription';
    if (lowerText.includes('medical')) return 'medical';
    if (lowerText.includes('bill')) return 'bill';
    
    return 'general';
  } catch (error: any) {
    console.error('Error detecting document type:', error.message);
    return 'general';
  }
}

// Keep your existing parseExtractedData function
function parseExtractedData(rawText: string): ExtractedData {
  // ... your existing parseExtractedData function ...
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
    if (!extractedData.otherText) extractedData.otherText = '';
    extractedData.otherText += `Emails: ${emailMatches.join(', ')}\n`;
  }

  // Enhanced name detection
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    const words = line.split(/\s+/);
    
    if (words.length >= 2 && words.length <= 4) {
      const hasUpperCase = words.some(word => /^[A-Z][a-z]*$/.test(word));
      const hasDigits = /\d/.test(line);
      
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

  // Fallback address detection
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
           text.length > 3;
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