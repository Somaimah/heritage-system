/**
 * Standardizes comma-separated strings into a clean array of lowercase tags.
 * Safely handles empty inputs and trims accidental whitespace.
 */
export const processTags = (tagsInput) => {
    if (!tagsInput) return [];
    return tagsInput
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
  };
  
  /**
   * Shared Cloudinary Widget Styling configuration.
   * Consolidates the palette theme to maintain uniform branding across all portals.
   */
  export const CLOUDINARY_WIDGET_STYLE = {
    palette: {
      window: "#FFFFFF",
      windowBorder: "#4A0C16",
      tabIcon: "#E09F26",
      menuIcons: "#4A0C16",
      textDark: "#000000",
      textLight: "#FFFFFF",
      link: "#E09F26",
      action: "#4A0C16",
      inactiveTabIcon: "#4A0C16",
      error: "#F44235",
      inProgress: "#E09F26",
      complete: "#20B832",
      sourceBg: "#F4F1EA"
    }
  };