import { MetadataResponse } from '../types';
import { isSafeImageUrl } from './url';

export async function fetchMetadata(targetUrl: string): Promise<MetadataResponse> {
  try {
    const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(apiUrl);
    const json = await res.json();

    if (json.status !== 'success' || !json.data) {
      return {};
    }

    const data = json.data;
    const rawImage = typeof data.image?.url === 'string' ? data.image.url : undefined;
    const safeImage = rawImage && isSafeImageUrl(rawImage) ? rawImage : undefined;

    return {
      title: typeof data.title === 'string' ? data.title : undefined,
      image: safeImage,
      description: typeof data.description === 'string' ? data.description : undefined,
      price: extractPrice(data),
    };
  } catch {
    return {};
  }
}

function extractPrice(data: Record<string, unknown>): string | undefined {
  // Try to find price in various metadata locations
  const lang = data.lang as string | undefined;
  
  // Check if there's a price-like string in the data
  if (typeof data.price === 'string') return data.price;
  
  // Some sites expose price via jsonld or meta tags that Microlink captures
  const description = (data.description || '') as string;
  const priceMatch = description.match(/\$[\d,.]+/);
  if (priceMatch) return priceMatch[0];

  return undefined;
}
