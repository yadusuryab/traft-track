'use client';

import { useEffect, useState } from 'react';
import { Image } from '../types';
import NextImage from 'next/image';
import { IconSearch, IconShare, IconX, IconPackage } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function HomePage() {
  const [images, setImages] = useState<Image[]>([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    fetchImages();
  }, [search, currentPage]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(search && { search }),
      });

      const response = await fetch(`/api/public/images?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setImages(data.data.images);
        setPagination(data.data.pagination);
        setImageErrors(new Set());
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchImages();
  };

  const handleImageError = (imageUrl: string) => {
    setImageErrors(prev => new Set(prev.add(imageUrl)));
  };

  const handleImageClick = (image: Image) => {
    setSelectedImage(image);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedImage(null);
  };

  const handleShare = async () => {
    if (!selectedImage) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedImage.title || 'Document Image',
          text: 'Check out this document',
          url: selectedImage.url,
        });
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(selectedImage.url);
        alert('Image URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractTrackingNumber = (rawText: any): any => {
    // Common tracking number patterns
    const patterns = [
      /\b\d{10,15}\b/g, // 10-15 digit numbers
      /\b[A-Z0-9]{8,15}\b/g, // Alphanumeric codes (8-15 chars)
      /\bDTDC[A-Z0-9]{6,12}\b/gi, // DTDC specific format
    ];

    for (const pattern of patterns) {
      const matches = rawText.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }

    return null;
  };

  const handleTrack = () => {
    if (!selectedImage?.rawText) {
      alert('No tracking information available for this document.');
      return;
    }

    const trackingNumber = extractTrackingNumber(selectedImage?.rawText);
    
    if (trackingNumber) {
      // Redirect to DTDC tracking page with the tracking number
      const trackingUrl = `https://www.dtdc.in/tracking.asp?ref=${trackingNumber}`;
      window.open(trackingUrl, '_blank');
    } else {
      alert('No tracking number found in this document.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Modern Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name / Phone or Address"
                className="block w-full pl-10 pr-4 py-4 border border-gray-200 rounded-2xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <Button
                type="submit"
                size={'icon'}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                <IconSearch />
              </Button>
            </div>
          </form>
        </div>

        {/* Images Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {images.map((image) => (
                <div
                  key={image._id}
                  onClick={() => handleImageClick(image)}
                  className="group relative aspect-square bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                >
                  {imageErrors.has(image.url) ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-gray-500">Image not available</p>
                      </div>
                    </div>
                  ) : (
                    <NextImage
                      width={100}
                      height={100}
                      src={image.url}
                      alt={image.title || 'Document image'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() => handleImageError(image.url)}
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>

            {images.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg">No documents found</p>
                <p className="text-gray-400 mt-1">Try adjusting your search terms</p>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-12">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-3 rounded-xl border border-gray-300 disabled:opacity-30 hover:bg-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={currentPage === pagination.pages}
                  className="p-3 rounded-xl border border-gray-300 disabled:opacity-30 hover:bg-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {/* Image Popup Modal */}
        {showPopup && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="relative">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-lg font-semibold truncate">
                    {selectedImage.title || 'Document'}
                  </h3>
                  <button
                    onClick={closePopup}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                {/* Image */}
                <div className="max-h-[60vh] overflow-auto">
                  {imageErrors.has(selectedImage.url) ? (
                    <div className="w-full h-64 flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-500">Image not available</p>
                      </div>
                    </div>
                  ) : (
                    <NextImage
                      width={800}
                      height={600}
                      src={selectedImage.url}
                      alt={selectedImage.title || 'Document image'}
                      className="w-full h-auto object-contain"
                      onError={() => handleImageError(selectedImage.url)}
                    />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between p-4 border-t">
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <IconShare className="w-4 h-4" />
                    Share
                  </Button>
                  
                  <Button
                    onClick={handleTrack}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
                  >
                    <IconPackage className="w-4 h-4" />
                    Track DTDC
                  </Button>
                </div>

                {/* Tracking Info (if available) */}
                {selectedImage.rawText && (
                  <div className="p-4 border-t bg-gray-50">
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-1">Extracted Information:</p>
                      <p className="text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                        {selectedImage.rawText}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}