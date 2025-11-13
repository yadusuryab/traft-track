/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Image } from "../types";
import NextImage from "next/image";
import {
  IconSearch,
  IconShare,
  IconX,
  IconPackage,
  IconArrowRight,
  IconArrowLeft,
  IconInfoCircle,
  IconShare2,
  IconChevronDown,
  IconExternalLink,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShineBorder } from "@/components/ui/shine-border";
import { RainbowButton } from "@/components/ui/rainbow-button";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Tracking sites data
// Tracking sites data
const trackingSites = [
  {
    name: "DTDC Tracking",
    description: "Track your DTDC shipments",
    url: "https://www.dtdc.in/tracking.asp",
    logo: "dtdc.png",
    color: "bg-blue-50 border-blue-200",
    textColor: "text-blue-700",
  },
  {
    name: "India Post Tracking",
    description: "Track your India Post parcels",
    url: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
    logo: "indiapost.jpeg",
    color: "bg-red-50 border-red-200",
    textColor: "text-red-700",
  },
];

export default function HomePage() {
  const [images, setImages] = useState<Image[]>([]);
  const [search, setSearch] = useState("");
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
    const lastSearchTime = localStorage.getItem("lastSearchTime");
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
      localStorage.setItem("lastSearchTime", Date.now().toString());
    }
  }, [currentPage, hasSearched]);

  const fetchImages = async () => {
    if (!search.trim()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
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
      console.error("Failed to fetch images:", error);
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
    setImageErrors((prev) => new Set(prev.add(imageUrl)));
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
          title: selectedImage.title || "Document Image",
          text: "Check out this document",
          url: selectedImage.url,
        });
      } else {
        await navigator.clipboard.writeText(selectedImage.url);
        alert("Image URL copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const extractTrackingNumber = (
    rawText: string
  ): { number: string | null; carrier: string } => {
    const carrierPatterns = {
      dtdc: { pattern: /\bDTDC[A-Z0-9]{6,12}\b/gi, name: "DTDC" },
      fedex: { pattern: /\b[0-9]{12,15}\b/g, name: "FedEx" },
      ups: { pattern: /\b1Z[A-Z0-9]{16}\b/gi, name: "UPS" },
      usps: { pattern: /\b(94|93|92|94|95)[0-9]{20,22}\b/g, name: "USPS" },
      dhl: { pattern: /\b[0-9]{10,11}\b/g, name: "DHL" },
      generic: { pattern: /\b[A-Z0-9]{8,15}\b/g, name: "Generic" },
    };

    for (const [carrier, { pattern, name }] of Object.entries(
      carrierPatterns
    )) {
      const matches = rawText.match(pattern);
      if (matches && matches.length > 0) {
        return { number: matches[0], carrier: name };
      }
    }

    return { number: null, carrier: "Unknown" };
  };

  const getTrackingUrl = (trackingNumber: string, carrier: string): string => {
    const urls = {
      DTDC: `https://www.dtdc.in/tracking.asp?ref=${trackingNumber}`,
      FedEx: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      Generic: `https://www.parcelsapp.com/en/tracking/${trackingNumber}`,
    };

    return urls[carrier as keyof typeof urls] || urls.Generic;
  };

  const handleTrack = () => {
    if (!selectedImage?.rawText) {
      alert("No tracking information available for this document.");
      return;
    }

    const { number: trackingNumber, carrier } = extractTrackingNumber(
      selectedImage.rawText
    );

    if (trackingNumber) {
      const trackingUrl = getTrackingUrl(trackingNumber, carrier);
      window.open(trackingUrl, "_blank");
    } else {
      alert("No tracking number found in this document.");
    }
  };

  const clearSearch = () => {
    setSearch("");
    setImages([]);
    setHasSearched(false);
    setCurrentPage(1);
  };

  const dismissNotification = () => {
    setShowNotification(false);
  };

  const openTrackingSite = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-muted rounded-t-4xl  ">
      <div className="container mx-auto px-3 py-8">
        {/* Notification Banner */}
        <div className="max-w-4xl mx-auto mb-6 bg-green-100 dark:bg-green-900 rounded-xl p-2">
          <div className="flex items-start justify-between">
            <div className="items-start space-x-2">
              <div className="flex space-x-1">
                <IconInfoCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />{" "}
                <h4 className="font-bold tracking-tighter text-green-900  dark:text-green-400 mb-1">
                  IMPORTANT NOTE{" "}
                </h4>
              </div>

              <div>
                <p className="text-green-700  dark:text-green-400 italic font-semibold tracking-tight text-sm">
                  Your Package Tracking Ids are only updated here 24 hours after
                  confirming your order. Please wait until then.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section with Search */}
        <div className="mb-4">
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative bg-background rounded-full ">
                <ShineBorder shineColor={["#A07CFE", "green", "#FFBE7B"]} />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconSearch className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Track your order here."
                  className="w-full pl-10 pr-24 py-2 border-0 rounded-full tracking-tighter font-semibold placeholder:text-muted-foreground focus:ring-0 sm:text-sm"
                />

                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
                  {search && (
                    <button
                      onClick={clearSearch}
                      className="px-2 py-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  )}
                  <Button
                    type="submit"
                    disabled={!search.trim() || loading}
                    size={"sm"}
                    className="rounded-full"
                  >
                    {loading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground tracking-tighter text-sm text-start italic mt-1">
                Search by name, phone number, or delivery address to find your
                package.
              </p>
            </form>
          </div>
        </div>

        {/* Tracking Sites Grid - Show when no search has been performed */}
        {!hasSearched && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tighter mb-2">
                Tracking sites
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {trackingSites.map((site, index) => (
                <div
                  key={index}
                  onClick={() => openTrackingSite(site.url)}
                  className={`bg-background flex flex-col justify-center items-center rounded-3xl p-4 cursor-pointer hover:shadow-md transition-all duration-200 group hover:scale-105`}
                >
                  <div className="relative w-full max-w-24 h-24 mb-2">
                    <div className="w-full h-full rounded-lg flex items-center justify-center overflow-hidden">
                      <NextImage
                        src={`/${site.logo}`}
                        alt={site.name}
                        width={96}
                        height={96}
                        className="object-contain w-full h-full"
                      />
                    </div>
                    <IconExternalLink
                      className={`absolute -top-1 -right-1 w-4 h-4 ${site.textColor} opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-0.5 border`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="max-w-4xl mx-auto mt-6">
              <div className="bg-background rounded-3xl p-6 ">
                <div className="flex flex-col ">
                  <h3 className="text-xl font-bold tracking-tighter mb-2 text-green-900 dark:text-green-400 italic">
                    For New Product Purchases.
                  </h3>
                  <p className="text-muted-foreground mb-4 text-base tracking-tighter font-semibold">
                    Visit our main store for new orders and purchases
                  </p>
                  <RainbowButton
                    onClick={() => window.open("https://traft.in", "_blank")}
                  >
                    Visit traft.in
                  </RainbowButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {hasSearched && (
          <div className="max-w-7xl mx-auto">
            {/* Results Header */}
            {!loading && (
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg tracking-tighter font-semibold">
                    Search Results
                  </h2>
                  {pagination && (
                    <p className="text-muted-foreground tracking-tight text-sm italic">
                      {pagination.total} packages
                      {pagination.total !== 1 ? "s" : ""} found
                      {search && (
                        <span>
                          {" "}
                          for &quot;
                          <span className="font-medium">{search}</span>&quot;
                        </span>
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
                  <div
                    key={i}
                    className="aspect-square bg-gray-200 rounded-lg animate-pulse"
                  ></div>
                ))}
              </div>
            )}

            {/* Results Grid */}
            {!loading && images.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {images.map((image) => (
                    <div
                      key={image._id}
                      onClick={() => handleImageClick(image)}
                      className="group relative aspect-[3/4] bg-white rounded-xl overflow-hidden cursor-pointer "
                    >
                      {imageErrors.has(image.url) ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                          <div className="text-center p-4">
                            <svg
                              className="w-8 h-8 text-gray-400 mx-auto mb-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <p className="text-xs text-gray-500">
                              Image unavailable
                            </p>
                          </div>
                        </div>
                      ) : (
                        <NextImage
                          width={200}
                          height={200}
                          src={image.url}
                          alt={image.title || "Document image"}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                          onError={() => handleImageError(image.url)}
                          loading="lazy"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Tracking Instructions */}
                <div className="mt-8 p-4 bg-yellow-50 rounded-xl">
                  <div className="">
                    <div className="flex space-x-1">
                      <IconInfoCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />{" "}
                      <h4 className="font-bold tracking-tighter text-yellow-900 mb-1">
                        NOTE{" "}
                      </h4>
                    </div>
                    <p className="text-yellow-800 tracking-tighter text-sm italic font-medium">
                      Please use the tracking ID provided in the picture near
                      the barcode and track using DTDC.in or the respective
                      couriers site shown in the package
                    </p>
                  </div>
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-8">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-md border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                    >
                      <IconArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="flex space-x-1">
                      {Array.from(
                        { length: Math.min(5, pagination.pages) },
                        (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-md text-sm transition-colors ${
                                currentPage === page
                                  ? "bg-gray-900 text-white"
                                  : "text-gray-600 hover:bg-gray-100 border border-gray-300"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(pagination.pages, p + 1))
                      }
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
              <div className="text-center py-12 bg-white rounded-xl">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold tracking-tighter mb-2">
                  Your Package not found.
                </h3>

                <div className="text-sm tracking-tight text-start text-muted-foreground bg-muted w-fit rounded-xl mx-auto px-4 py-2">
                  <h4 className="font-semibold">Please read carefully</h4>
                  <ul className="list-decimal list-inside">
                    <li>Verify Phone number/ name or address</li>

                    <li>New Orders may take 24 hours to appear</li>
                    <li>Try again later.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image Popup Modal */}
        {showPopup && selectedImage && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <div className="relative bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              {/* Floating Header */}
              <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-2 ">
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 p-1 max-w-md">
                  <h3 className="text-white font-semibold text-md truncate">
                    {selectedImage.extractedData.name}
                  </h3>
                </div>

                <Button
                  size={"icon"}
                  onClick={closePopup}
                  className="bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-3 transition-colors flex-shrink-0"
                >
                  <IconX className="text-white" />
                </Button>
              </div>

              {/* Main Image Content */}
              <div className="w-full h-full bg-gray-900">
                {imageErrors.has(selectedImage.url) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
                    <svg
                      className="w-20 h-20 text-gray-400 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-300 text-xl font-medium">
                      Image not available
                    </p>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <NextImage
                      width={1200}
                      height={800}
                      src={selectedImage.url}
                      alt={selectedImage.title || "Shipment document"}
                      className="max-w-full max-h-full object-contain"
                      onError={() => handleImageError(selectedImage.url)}
                    />

                    {/* Floating Share Button */}
                    <div className="absolute shadow-lg bottom-2 right-2 z-20">
                      <Button
                        onClick={handleShare}
                        size="sm"
                        className="bg-black/50 rounded-full hover:bg-black/70 backdrop-blur-sm text-white border-0 shadow-lg"
                      >
                        <IconShare2 />
                        Share
                      </Button>
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
