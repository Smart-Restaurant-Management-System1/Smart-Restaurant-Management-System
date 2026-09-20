/**
 * Pure validation and calculation helpers for Restaurant Menu Management
 */

export function calculateMenuMetrics(menuItems) {
  const items = Array.isArray(menuItems) ? menuItems : [];
  const total = items.length;
  const available = items.filter((item) => item.isAvailable).length;
  const unavailable = total - available;
  const categoriesCount = new Set(items.map((item) => item.category)).size;

  return {
    total,
    available,
    unavailable,
    categoriesCount,
  };
}

export function validateMenuItemPayload(formData) {
  if (!formData || !formData.itemName || !formData.itemName.trim()) {
    return { isValid: false, error: 'Dish name is required.' };
  }

  const priceNum = Number(formData.price);
  if (!formData.price || isNaN(priceNum) || priceNum <= 0) {
    return { isValid: false, error: 'Please enter a valid price greater than zero.' };
  }

  if (formData.imageReference && formData.imageReference.trim()) {
    const ref = formData.imageReference.trim();
    if (ref.startsWith('/uploads/')) {
      return { isValid: true, error: null };
    }

    try {
      const imageUrl = new URL(ref);
      if (!['http:', 'https:'].includes(imageUrl.protocol)) {
        return { isValid: false, error: 'Image URL must begin with http:// or https://.' };
      }
    } catch {
      return { isValid: false, error: 'Please enter a valid image URL or upload a photo.' };
    }
  }

  return { isValid: true, error: null };
}

