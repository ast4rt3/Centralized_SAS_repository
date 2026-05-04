/**
 * Cloudinary Utility Module
 */

export function extractCloudinaryId(url) {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) return null;
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  
  const segments = parts[1].split('/');
  let startIndex = 0;
  
  // Skip transformation/version segments (they start with v or contain ,)
  while (startIndex < segments.length) {
    const seg = segments[startIndex];
    if (seg.startsWith('v') && !isNaN(seg.substring(1))) { startIndex++; break; }
    if (seg.includes(',')) { startIndex++; continue; }
    break; 
  }
  
  const idWithExt = segments.slice(startIndex).join('/');
  return idWithExt.split('.')[0];
}
