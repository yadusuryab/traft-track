// app/admin/upload/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface UploadItem {
  id: string;
  file: File | null;
  previewUrl: string;
  uploading: boolean;
  error?: string;
}

export default function UploadPage() {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    
    // Limit to 15 files
    const selectedFiles = files.slice(0, 15 - uploadItems.length);
    
    if (selectedFiles.length === 0) {
      setGlobalError('Maximum 15 files allowed. Please remove some files to add more.');
      return;
    }

    const newItems: UploadItem[] = selectedFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    }));

    setUploadItems(prev => [...prev, ...newItems]);
    setGlobalError('');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeItem = (id: string) => {
    setUploadItems(prev => {
      const newItems = prev.filter(item => item.id !== id);
      // Adjust current index if needed
      if (currentIndex >= newItems.length) {
        setCurrentIndex(Math.max(0, newItems.length - 1));
      }
      return newItems;
    });
  };

  const clearAll = () => {
    setUploadItems([]);
    setCurrentIndex(0);
    setGlobalError('');
    setSuccessCount(0);
  };

  const nextItem = () => {
    setCurrentIndex(prev => Math.min(prev + 1, uploadItems.length - 1));
  };

  const prevItem = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const uploadSingleItem = async (item: UploadItem): Promise<boolean> => {
    try {
      const uploadData = new FormData();
      uploadData.append('image', item.file!);
      
      // Auto-generate title from filename
      const autoTitle = item.file!.name.replace(/\.[^/.]+$/, "");
      uploadData.append('title', autoTitle);
      uploadData.append('description', `Uploaded document: ${autoTitle}`);
      uploadData.append('tags', 'auto-upload,bulk-upload');

      const response = await fetch('/api/admin/images/upload', {
        method: 'POST',
        body: uploadData,
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Upload failed:', error);
      return false;
    }
  };

  const handleBulkUpload = async () => {
    if (uploadItems.length === 0) {
      setGlobalError('Please select at least one file to upload');
      return;
    }

    setLoading(true);
    setGlobalError('');
    setSuccessCount(0);

    try {
      // Upload all items in parallel for better performance
      const uploadPromises = uploadItems.map(async (item, index) => {
        // Update UI to show uploading state
        setUploadItems(prev => 
          prev.map(prevItem => 
            prevItem.id === item.id ? { ...prevItem, uploading: true } : prevItem
          )
        );

        const success = await uploadSingleItem(item);

        // Update UI to show result
        setUploadItems(prev => 
          prev.map(prevItem => 
            prevItem.id === item.id 
              ? { 
                  ...prevItem, 
                  uploading: false, 
                  error: success ? undefined : 'Upload failed' 
                } 
              : prevItem
          )
        );

        if (success) {
          setSuccessCount(prev => prev + 1);
        }

        return success;
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(success => success).length;

      if (successfulUploads === uploadItems.length) {
        // All successful
        setTimeout(() => {
          router.push('/admin/images');
        }, 1000);
      } else if (successfulUploads > 0) {
        // Some successful
        setGlobalError(`${successfulUploads}/${uploadItems.length} files uploaded successfully. ${uploadItems.length - successfulUploads} failed.`);
      } else {
        // All failed
        setGlobalError('All uploads failed. Please try again.');
      }
    } catch (error) {
      setGlobalError('Upload process failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentItem = uploadItems[currentIndex];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Image Upload</h1>
        <div className="flex gap-3">
          {uploadItems.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* File Selection Area */}
      <div className="mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer block"
          >
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="mt-2 block text-sm font-semibold text-gray-900">
              Select images to upload
            </span>
            <span className="mt-1 block text-sm text-gray-500">
              Drag and drop or click to select multiple files (max 15)
            </span>
            <span className="mt-1 block text-xs text-gray-400">
              Supported: JPG, PNG, PDF, etc. - Titles and descriptions will be auto-generated
            </span>
          </label>
        </div>
      </div>

      {/* Upload Stats */}
      {uploadItems.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-semibold text-blue-800">
                {uploadItems.length} file{uploadItems.length !== 1 ? 's' : ''} selected
              </span>
              <span className="text-blue-600 ml-2">
                ({15 - uploadItems.length} remaining)
              </span>
            </div>
            {successCount > 0 && (
              <span className="text-green-600 font-semibold">
                {successCount} uploaded successfully
              </span>
            )}
          </div>
        </div>
      )}

      {/* Carousel Preview */}
      {uploadItems.length > 0 && (
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Preview {currentIndex + 1} of {uploadItems.length}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={prevItem}
                disabled={currentIndex === 0}
                className="p-2 border border-gray-300 rounded-md disabled:opacity-50"
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={nextItem}
                disabled={currentIndex === uploadItems.length - 1}
                className="p-2 border border-gray-300 rounded-md disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div>
              <div className="border-2 border-gray-200 rounded-lg p-4 h-80 flex items-center justify-center bg-gray-50">
                {currentItem.previewUrl ? (
                  <img
                    src={currentItem.previewUrl}
                    alt="Preview"
                    className="max-h-72 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    No preview available
                  </div>
                )}
              </div>
              
              {/* File Info */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-900">
                  {currentItem.file?.name}
                </p>
                <p className="text-sm text-gray-500">
                  Size: {(currentItem.file?.size || 0) / 1024 / 1024 > 1 
                    ? `${((currentItem.file?.size || 0) / 1024 / 1024).toFixed(2)} MB`
                    : `${((currentItem.file?.size || 0) / 1024).toFixed(2)} KB`
                  }
                </p>
                <p className="text-sm text-gray-500">
                  Auto-title: {currentItem.file?.name.replace(/\.[^/.]+$/, "")}
                </p>
              </div>

              {currentItem.uploading && (
                <div className="mt-2 text-sm text-blue-600">
                  ⏳ Uploading and processing...
                </div>
              )}

              {currentItem.error && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  ❌ {currentItem.error}
                </div>
              )}
            </div>

            {/* Thumbnail Grid */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">All Files</h4>
              <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                {uploadItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`relative border-2 rounded-lg cursor-pointer ${
                      index === currentIndex ? 'border-indigo-500' : 'border-gray-200'
                    }`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <div className="aspect-square bg-gray-100 rounded flex items-center justify-center p-1">
                      <img
                        src={item.previewUrl}
                        alt={`Thumbnail ${index + 1}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                    {item.uploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Error */}
      {globalError && (
        <div className="mb-4 text-red-600 text-sm bg-red-50 p-4 rounded-md">
          {globalError}
        </div>
      )}

      {/* Upload Button */}
      {uploadItems.length > 0 && (
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleBulkUpload}
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-lg font-medium"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Uploading {uploadItems.length} Files...
              </span>
            ) : (
              `Upload All ${uploadItems.length} Files`
            )}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>📄 Titles and descriptions are automatically generated from filenames</p>
        <p>🔍 Text extraction (name, phone, address, etc.) happens automatically during upload</p>
        <p>⚡ Upload multiple files at once for better efficiency</p>
      </div>
    </div>
  );
}