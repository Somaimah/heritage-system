// src/utils/mediaUtils.js

/**
 * Analyzes a URL and determines its media type based on the extension.
 * This prepares the system for Cloudinary's dynamic media handling.
 */
export const detectMediaType = (url) => {
    if (!url) return "unknown";
    
    // Extract the part of the URL after the last dot
    const extension = url.split('.').pop().toLowerCase().split('?')[0]; 
  
    if (["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(extension)) return "image";
    if (["pdf"].includes(extension)) return "pdf";
    if (["mp3", "wav", "ogg"].includes(extension)) return "audio";
    if (["mp4", "webm", "mov"].includes(extension)) return "video";
    
    return "unknown"; // Default fallback
  };