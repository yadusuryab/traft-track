/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/vision-ocrspace.ts - Using OCR.space Free API
export interface ExtractedData {
  name?: string;
  phoneNumber?: string;
  address?: string;
  otherText?: string;
  rawText: string;
}

async function callOCRSpaceAPI(base64Image: string): Promise<any> {
  const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'; // 'helloworld' is the free public key
  
  const formData = new URLSearchParams();
  formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
  formData.append('apikey', apiKey);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2'); // Engine 2 is more accurate
  formData.append('scale', 'true');
  formData.append('isTable', 'true');

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OCR.space API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  
  // Check for OCR.space specific errors
  if (result.IsErroredOnProcessing) {
    throw new Error(result.ErrorMessage[0] || 'OCR.space processing failed');
  }

  return result;
}

export async function extractTextFromImage(imageBuffer: Buffer | string): Promise<ExtractedData> {
  try {
    console.log('Starting text extraction from image with OCR.space...');
    
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

    console.log('Calling OCR.space API...');
    const result = await callOCRSpaceAPI(imageContent);

    const parsedResults = result.ParsedResults;
    let rawText = '';
    
    if (parsedResults && parsedResults.length > 0) {
      rawText = parsedResults[0].ParsedText || '';
      console.log('Raw text extracted, length:', rawText.length);
      
      // Clean up common OCR.space artifacts
      rawText = rawText.replace(/\r\n/g, '\n').trim();
    } else {
      console.log('No text detected in image');
    }

    return parseExtractedData(rawText);
  } catch (error: any) {
    console.error('Error extracting text from image with OCR.space:', {
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
    console.log('Detecting document type with OCR.space...');
    
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

    const result = await callOCRSpaceAPI(imageContent);
    const parsedResults = result.ParsedResults;
    const text = parsedResults && parsedResults.length > 0 ? parsedResults[0].ParsedText || '' : '';
    
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
    console.error('Error detecting document type with OCR.space:', error.message);
    return 'general';
  }
}

// Enhanced version with OCR.space specific improvements
export async function extractTextWithOCRSpaceAdvanced(imageBuffer: Buffer | string): Promise<ExtractedData> {
  try {
    console.log('Starting advanced text extraction with OCR.space...');
    
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

    // Try different OCR engines for better accuracy
    const engines = [1, 2]; // Engine 1 is faster, Engine 2 is more accurate
    const bestResult = { rawText: '' };
    
    for (const engine of engines) {
      try {
        console.log(`Trying OCR Engine ${engine}...`);
        
        const formData = new URLSearchParams();
        formData.append('base64Image', `data:image/jpeg;base64,${imageContent}`);
        formData.append('apikey', process.env.OCR_SPACE_API_KEY || 'helloworld');
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('OCREngine', engine.toString());
        
        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          if (!result.IsErroredOnProcessing && result.ParsedResults?.[0]?.ParsedText) {
            const text = result.ParsedResults[0].ParsedText.replace(/\r\n/g, '\n').trim();
            
            // Use the result with more text as the best result
            if (text.length > bestResult.rawText.length) {
              bestResult.rawText = text;
            }
          }
        }
      } catch (engineError) {
        console.warn(`OCR Engine ${engine} failed:`, engineError);
      }
    }

    console.log('Best raw text extracted, length:', bestResult.rawText.length);
    return parseExtractedData(bestResult.rawText);
    
  } catch (error: any) {
    console.error('Error in advanced OCR.space extraction:', error.message);
    return {
      rawText: '',
    };
  }
}

// Your existing parseExtractedData function (unchanged)
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