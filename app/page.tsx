/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { Image } from '../types';
import NextImage from 'next/image';
import { IconSearch, IconShare, IconX, IconPackage, IconArrowRight, IconArrowLeft } from '@tabler/icons-react';
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
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (hasSearched) {
      fetchImages();
    }
  }, [currentPage, hasSearched]);

  const fetchImages = async () => {
    if (!search.trim()) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        search: search.trim(),
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
    if (!search.trim()) return;
    
    setCurrentPage(1);
    setHasSearched(true);
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
        await navigator.clipboard.writeText(selectedImage.url);
        alert('Image URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const extractTrackingNumber = (rawText: string): string | null => {
    const patterns = [
      /\b\d{10,15}\b/g,
      /\b[A-Z0-9]{8,15}\b/g,
      /\bDTDC[A-Z0-9]{6,12}\b/gi,
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

    const trackingNumber = extractTrackingNumber(selectedImage.rawText);
    
    if (trackingNumber) {
      const trackingUrl = `https://www.dtdc.in/tracking.asp?ref=${trackingNumber}`;
      window.open(trackingUrl, '_blank');
    } else {
      alert('No tracking number found in this document.');
    }
  };

  const clearSearch = () => {
    setSearch('');
    setImages([]);
    setHasSearched(false);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section with Search */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Find Your Packages
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Search by name, phone number, or address to quickly locate your important documents
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <IconSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Enter name, phone number, or address..."
                  className="w-full pl-12 pr-24 py-4 border-0 rounded-2xl bg-transparent focus:outline-none focus:ring-0 text-lg placeholder-gray-400"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
                  {search && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="px-3 py-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <IconX className="h-5 w-5" />
                    </button>
                  )}
                  <Button
                    type="submit"
                    disabled={!search.trim() || loading}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>
            </form>
            
            {/* Search Tips */}
            <div className="mt-4 text-sm text-gray-500">
              <p>Tip: Use specific details for better results</p>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {hasSearched && (
          <div className="max-w-7xl mx-auto">
            {/* Results Header */}
            {!loading && (
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Search Results
                  </h2>
                  {pagination && (
                    <p className="text-gray-600 mt-1">
                      Found {pagination.total} document{pagination.total !== 1 ? 's' : ''}
                      {search && (
                        <span> for &quot;<span className="font-medium">{search}</span>&quot;</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse"></div>
                ))}
              </div>
            )}

            {/* Results Grid */}
            {!loading && images.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {images.map((image) => (
                    <div
                      key={image._id}
                      onClick={() => handleImageClick(image)}
                      className="group relative aspect-square bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500"
                    >
                      {imageErrors.has(image.url) ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
                          <div className="text-center p-4">
                            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-xs text-gray-500">Image unavailable</p>
                          </div>
                        </div>
                      ) : (
                        <NextImage
                          width={200}
                          height={200}
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

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-12">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-3 rounded-xl border border-gray-300 disabled:opacity-30 hover:bg-white transition-colors"
                    >
                      <IconArrowLeft className="w-5 h-5" />
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
                      <IconArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* No Results State */}
            {!loading && images.length === 0 && hasSearched && (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-600 mb-4">We couldn&apos;t find any documents matching your search</p>
                <div className="text-sm text-gray-500">
                  <p className="mb-1">• Check for typos in your search</p>
                  <p className="mb-1">• Try different search terms</p>
                  <p>• Use partial names or addresses</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Features Section - Show when no search has been performed */}
        {!hasSearched && (
          <div className="max-w-4xl mx-auto mt-20">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <IconSearch className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Easy Search</h3>
                <p className="text-gray-600">Find your documents quickly using name, phone, or address</p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                  <IconPackage className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Track Packages</h3>
                <p className="text-gray-600">One-click tracking for DTDC shipments</p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <IconShare className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Easy Sharing</h3>
                <p className="text-gray-600">Share documents with others instantly</p>
              </div>
            </div>
          </div>
        )}

        {/* Image Popup Modal */}
        {showPopup && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden w-full">
              <div className="relative">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                  <h3 className="text-xl font-semibold truncate flex-1 mr-4">
                    {selectedImage.title || 'Document'}
                  </h3>
                  <button
                    onClick={closePopup}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  >
                    <IconX className="w-6 h-6" />
                  </button>
                </div>

                {/* Image */}
                <div className="max-h-[60vh] overflow-auto flex items-center justify-center p-4">
                  {imageErrors.has(selectedImage.url) ? (
                    <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
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
                      className="max-w-full h-auto max-h-[60vh] object-contain rounded-lg"
                      onError={() => handleImageError(selectedImage.url)}
                    />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between p-6 border-t">
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

                {/* Tracking Info */}
                {selectedImage.rawText && (
                  <div className="p-6 border-t bg-gray-50">
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-2">Extracted Information:</p>
                      <div className="bg-white p-3 rounded-lg border max-h-32 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap font-sans">
                          {selectedImage.rawText}
                        </pre>
                      </div>
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