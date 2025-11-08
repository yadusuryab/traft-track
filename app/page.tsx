/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { Image } from '../types';
import NextImage from 'next/image';
import { IconSearch, IconShare, IconX, IconPackage, IconArrowRight, IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
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
  const [showNotification, setShowNotification] = useState(false);

  // Check if we should show the 24-hour notification
  useEffect(() => {
    const lastSearchTime = localStorage.getItem('lastSearchTime');
    const now = Date.now();
    
    if (lastSearchTime) {
      const timeDiff = now - parseInt(lastSearchTime);
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      // Show notification if last search was more than 24 hours ago
      if (hoursDiff > 24) {
        setShowNotification(true);
      }
    } else {
      // First time user
      setShowNotification(true);
    }
  }, [hasSearched]);

  useEffect(() => {
    if (hasSearched) {
      fetchImages();
      // Store search time
      localStorage.setItem('lastSearchTime', Date.now().toString());
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
    setShowNotification(false); // Hide notification when user searches
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

  const extractTrackingNumber = (rawText: string): { number: string | null; carrier: string } => {
    const carrierPatterns = {
      dtdc: { pattern: /\bDTDC[A-Z0-9]{6,12}\b/gi, name: 'DTDC' },
      fedex: { pattern: /\b[0-9]{12,15}\b/g, name: 'FedEx' },
      ups: { pattern: /\b1Z[A-Z0-9]{16}\b/gi, name: 'UPS' },
      usps: { pattern: /\b(94|93|92|94|95)[0-9]{20,22}\b/g, name: 'USPS' },
      dhl: { pattern: /\b[0-9]{10,11}\b/g, name: 'DHL' },
      generic: { pattern: /\b[A-Z0-9]{8,15}\b/g, name: 'Generic' }
    };

    for (const [carrier, { pattern, name }] of Object.entries(carrierPatterns)) {
      const matches = rawText.match(pattern);
      if (matches && matches.length > 0) {
        return { number: matches[0], carrier: name };
      }
    }
    
    return { number: null, carrier: 'Unknown' };
  };

  const getTrackingUrl = (trackingNumber: string, carrier: string): string => {
    const urls = {
      'DTDC': `https://www.dtdc.in/tracking.asp?ref=${trackingNumber}`,
      'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
      'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      'Generic': `https://www.parcelsapp.com/en/tracking/${trackingNumber}`
    };
    
    return urls[carrier as keyof typeof urls] || urls.Generic;
  };

  const handleTrack = () => {
    if (!selectedImage?.rawText) {
      alert('No tracking information available for this document.');
      return;
    }

    const { number: trackingNumber, carrier } = extractTrackingNumber(selectedImage.rawText);
    
    if (trackingNumber) {
      const trackingUrl = getTrackingUrl(trackingNumber, carrier);
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

  const dismissNotification = () => {
    setShowNotification(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Notification Banner */}
        {showNotification && (
          <div className="max-w-4xl mx-auto mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <IconInfoCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Update Frequency Notice</h4>
                  <p className="text-blue-700 text-sm">
                    Package information is updated every 24 hours. Your search results reflect the most recent data available. 
                    New shipments may take up to 24 hours to appear in the system.
                  </p>
                </div>
              </div>
              <button
                onClick={dismissNotification}
                className="text-blue-500 hover:text-blue-700 flex-shrink-0 ml-4"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Hero Section with Search */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Package Tracking Portal
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            Search by recipient name, phone number, or delivery address to locate your shipment documents
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors duration-200">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Enter name, phone number, or address..."
                  className="w-full pl-10 pr-24 py-3 border-0 rounded-lg bg-transparent focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-500"
                />
                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
                  {search && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="px-2 py-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  )}
                  <Button
                    type="submit"
                    disabled={!search.trim() || loading}
                    className="px-4 py-2 rounded-md bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Results Section */}
        {hasSearched && (
          <div className="max-w-7xl mx-auto">
            {/* Results Header */}
            {!loading && (
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Search Results
                  </h2>
                  {pagination && (
                    <p className="text-gray-600 mt-1">
                      {pagination.total} document{pagination.total !== 1 ? 's' : ''} found
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
                  <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
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
                      className="group relative aspect-square bg-white rounded-lg shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer border border-gray-200 hover:border-gray-300"
                    >
                      {imageErrors.has(image.url) ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
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
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                          onError={() => handleImageError(image.url)}
                          loading="lazy"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-8">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-md border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                    >
                      <IconArrowLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-md text-sm transition-colors ${
                              currentPage === page
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
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
                      className="p-2 rounded-md border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                    >
                      <IconArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* No Results State */}
            {!loading && images.length === 0 && hasSearched && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-xs">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-600 mb-4">No shipment documents match your search criteria</p>
                <div className="text-sm text-gray-500">
                  <p className="mb-1">• Verify spelling of names or addresses</p>
                  <p className="mb-1">• Try alternative search terms</p>
                  <p>• New shipments may take 24 hours to appear</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Features Section - Show when no search has been performed */}
        {!hasSearched && (
          <div className="max-w-4xl mx-auto mt-16">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <IconSearch className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="font-semibold mb-2">Document Search</h3>
                <p className="text-gray-600 text-sm">Find shipment documents by recipient details</p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <IconPackage className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="font-semibold mb-2">Multi-Carrier Tracking</h3>
                <p className="text-gray-600 text-sm">Track packages across various shipping carriers</p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <IconShare className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="font-semibold mb-2">Document Sharing</h3>
                <p className="text-gray-600 text-sm">Share shipment documents with relevant parties</p>
              </div>
            </div>
          </div>
        )}

        {/* Image Popup Modal */}
        {showPopup && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden w-full">
              <div className="relative">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold truncate flex-1 mr-4">
                    {selectedImage.title || 'Shipment Document'}
                  </h3>
                  <button
                    onClick={closePopup}
                    className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                {/* Image */}
                <div className="max-h-[60vh] overflow-auto flex items-center justify-center p-4">
                  {imageErrors.has(selectedImage.url) ? (
                    <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      alt={selectedImage.title || 'Shipment document'}
                      className="max-w-full h-auto max-h-[60vh] object-contain rounded"
                      onError={() => handleImageError(selectedImage.url)}
                    />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between p-4 border-t border-gray-200">
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="flex items-center gap-2 border-gray-300"
                  >
                    <IconShare className="w-4 h-4" />
                    Share Document
                  </Button>
                  
                  <Button
                    onClick={handleTrack}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800"
                  >
                    <IconPackage className="w-4 h-4" />
                    Track Package
                  </Button>
                </div>

                {/* Extracted Information */}
                {selectedImage.rawText && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-2">Extracted Document Information:</p>
                      <div className="bg-white p-3 rounded border border-gray-200 max-h-32 overflow-y-auto">
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