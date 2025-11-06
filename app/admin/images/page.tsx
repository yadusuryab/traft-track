/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/images/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Image } from '../../../types';

export default function ImagesPage() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch('/api/admin/images');
      const data = await response.json();
      if (data.success) {
        setImages(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(id);
    try {
      const response = await fetch(`/api/admin/images?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setImages(images.filter(img => img._id !== id));
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredImages = images.filter(image => 
    image.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.extractedData.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.extractedData.phoneNumber?.includes(searchTerm) ||
    image.extractedData.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Images</h1>
        <a
          href="/admin/upload"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Upload New
        </a>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, phone, address, tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredImages.map((image:any) => (
          <div key={image._id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <img
              src={image.url}
              alt={image.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">{image.title}</h3>
              <p className="text-gray-600 text-sm mb-2">{image.description}</p>
              
              {/* Extracted Data */}
              <div className="space-y-2 mb-3">
                {image.extractedData.name && (
                  <div>
                    <span className="font-medium text-sm text-gray-700">Name: </span>
                    <span className="text-sm">{image.extractedData.name}</span>
                  </div>
                )}
                {image.extractedData.phoneNumber && (
                  <div>
                    <span className="font-medium text-sm text-gray-700">Phone: </span>
                    <span className="text-sm">{image.extractedData.phoneNumber}</span>
                  </div>
                )}
                {image.extractedData.address && (
                  <div>
                    <span className="font-medium text-sm text-gray-700">Address: </span>
                    <span className="text-sm">{image.extractedData.address}</span>
                  </div>
                )}
                {image.documentType && image.documentType !== 'general' && (
                  <div>
                    <span className="font-medium text-sm text-gray-700">Type: </span>
                    <span className="text-sm capitalize">{image.documentType.replace('_', ' ')}</span>
                  </div>
                )}
              </div>

              {image.extractedData.otherText && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 line-clamp-2">
                    Other Text: {image.extractedData.otherText}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-1 mb-3">
                {image.tags.map((tag:any, index:any) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => handleDelete(image._id!)}
                disabled={deleteLoading === image._id}
                className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading === image._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredImages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchTerm ? 'No images match your search.' : 'No images found.'}
          </p>
        </div>
      )}
    </div>
  );
}