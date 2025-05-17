import { useEffect } from "react";

const MANAGED_TAG_SELECTOR = "meta[data-managed-tag], link[data-managed-tag]";
const MANAGED_TAG_ATTRIBUTE = "data-managed-tag";
const MANAGED_TAG_VALUE = "true";

interface HeadSeoProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  canonicalUrl?: string;
  [key: string]: any;
}

interface SeoTagDefinition {
  key: string;
  tagName: "meta" | "link";
  attributes: Record<string, string>;
}

const getSeoTagsDefinition = (props: HeadSeoProps): SeoTagDefinition[] => {
  const {
    title = "Dafthunk",
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType = "website",
    twitterCard = "summary_large_image",
    twitterSite,
    twitterCreator,
    canonicalUrl,
  } = props;

  const tags: SeoTagDefinition[] = [];

  const currentOgTitle = ogTitle || title;
  const currentOgDescription = ogDescription || description;

  // Meta Description
  if (description) {
    tags.push({
      key: "desc",
      tagName: "meta",
      attributes: { name: "description", content: description },
    });
  }

  // Meta Keywords
  if (keywords) {
    tags.push({
      key: "keywords",
      tagName: "meta",
      attributes: { name: "keywords", content: keywords },
    });
  }

  // Open Graph
  if (currentOgTitle) {
    tags.push({
      key: "og:title",
      tagName: "meta",
      attributes: { property: "og:title", content: currentOgTitle },
    });
  }
  if (currentOgDescription) {
    tags.push({
      key: "og:desc",
      tagName: "meta",
      attributes: { property: "og:description", content: currentOgDescription },
    });
  }
  if (ogImage) {
    tags.push({
      key: "og:image",
      tagName: "meta",
      attributes: { property: "og:image", content: ogImage },
    });
  }
  if (ogUrl) {
    tags.push({
      key: "og:url",
      tagName: "meta",
      attributes: { property: "og:url", content: ogUrl },
    });
  }
  if (ogType) {
    tags.push({
      key: "og:type",
      tagName: "meta",
      attributes: { property: "og:type", content: ogType },
    });
  }

  // Twitter Card
  if (twitterCard) {
    tags.push({
      key: "twitter:card",
      tagName: "meta",
      attributes: { name: "twitter:card", content: twitterCard },
    });
  }
  if (twitterSite) {
    tags.push({
      key: "twitter:site",
      tagName: "meta",
      attributes: { name: "twitter:site", content: twitterSite },
    });
  }
  if (twitterCreator) {
    tags.push({
      key: "twitter:creator",
      tagName: "meta",
      attributes: { name: "twitter:creator", content: twitterCreator },
    });
  }

  // Twitter fallbacks
  if (currentOgTitle) {
    tags.push({
      key: "twitter:title",
      tagName: "meta",
      attributes: { name: "twitter:title", content: currentOgTitle },
    });
  }
  if (currentOgDescription) {
    tags.push({
      key: "twitter:desc",
      tagName: "meta",
      attributes: {
        name: "twitter:description",
        content: currentOgDescription,
      },
    });
  }
  if (ogImage) {
    tags.push({
      key: "twitter:image",
      tagName: "meta",
      attributes: { name: "twitter:image", content: ogImage },
    });
  }

  // Canonical URL
  if (canonicalUrl) {
    tags.push({
      key: "canonical",
      tagName: "link",
      attributes: { rel: "canonical", href: canonicalUrl },
    });
  }

  return tags;
};

export const HeadSeo = (props: HeadSeoProps) => {
  const {
    title = "Dafthunk",
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType = "website",
    twitterCard = "summary_large_image",
    twitterSite,
    twitterCreator,
    canonicalUrl,
    ...otherProps
  } = props;

  useEffect(() => {
    // Clear previously managed tags
    document.head
      .querySelectorAll(MANAGED_TAG_SELECTOR)
      .forEach((tag) => tag.remove());
    document.title = title;

    const seoTagDefinitions = getSeoTagsDefinition(props);

    seoTagDefinitions.forEach(({ tagName, attributes }) => {
      const tag = document.createElement(tagName);
      Object.entries(attributes).forEach(([attrKey, attrValue]) => {
        if (attrValue != null) {
          // Set attribute if value is not null or undefined
          tag.setAttribute(attrKey, attrValue);
        }
      });
      tag.setAttribute(MANAGED_TAG_ATTRIBUTE, MANAGED_TAG_VALUE);
      document.head.appendChild(tag);
    });
  }, [
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType,
    twitterCard,
    twitterSite,
    twitterCreator,
    canonicalUrl,
    JSON.stringify(otherProps),
  ]);

  // This component is for side effects only and does not render to the DOM body on the client.
  // For SSR, it will render its tags as React elements.
  if (typeof window === "undefined") {
    const seoTagDefinitions = getSeoTagsDefinition(props);

    const ssrTags = seoTagDefinitions.map(({ key, tagName, attributes }) => {
      const { ...otherAttrs } = attributes; // Ensure key is not in otherAttrs if it somehow got there
      const elementProps = {
        ...otherAttrs,
        [MANAGED_TAG_ATTRIBUTE]: MANAGED_TAG_VALUE,
      };

      if (tagName === "meta") {
        return <meta key={key} {...elementProps} />;
      }
      // tagName === "link"
      return <link key={key} {...elementProps} />;
    });

    return (
      <>
        <title>{title}</title>
        {ssrTags}
      </>
    );
  }

  return null;
};
