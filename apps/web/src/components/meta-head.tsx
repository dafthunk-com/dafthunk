import { useEffect } from "react";

type MetaTag =
  | { name: string; content: string; property?: undefined }
  | { property: string; content: string; name?: undefined };

type MetaHeadProps = {
  title?: string;
  tags?: MetaTag[];
};

export function MetaHead({ title, tags = [] }: MetaHeadProps) {
  useEffect(() => {
    const originalTitle = document.title;
    if (title) {
      document.title = title;
    }

    const DYNAMIC_META_TAG_SELECTOR = 'meta[data-managed-by-metahead="true"]';
    // Remove existing managed meta tags
    document
      .querySelectorAll(DYNAMIC_META_TAG_SELECTOR)
      .forEach((tag) => tag.remove());

    const createdTags: HTMLMetaElement[] = [];

    tags.forEach((tagInfo) => {
      const metaElement = document.createElement("meta");
      if (tagInfo.name) {
        metaElement.name = tagInfo.name;
      } else if (tagInfo.property) {
        metaElement.setAttribute("property", tagInfo.property);
      }
      metaElement.content = tagInfo.content;
      metaElement.setAttribute("data-managed-by-metahead", "true"); // Mark as managed
      document.head.appendChild(metaElement);
      createdTags.push(metaElement);
    });

    return () => {
      if (title) {
        document.title = originalTitle; // Restore original title on unmount or title change
      }
      createdTags.forEach((tag) => tag.remove());
    };
  }, [title, tags]); // Re-run effect if title or tags change

  return null; // This component does not render anything itself
}
