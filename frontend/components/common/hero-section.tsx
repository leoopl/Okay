'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils'; // Utility function for conditional classes

/**
 * Props interface for the HeroSection component
 */
interface HeroSectionProps {
  /** Name of the image file (should be imported or from public directory) */
  imageName: string;
  /** Main headline text */
  title: string;
  /** Supporting descriptive text */
  description: string;
  /** Custom children to be rendered below the description */
  children?: React.ReactNode;
  /** Optional flag to hide image on mobile devices */
  hideImageOnMobile?: boolean;
  /** Position of image on mobile when visible ('top' or 'bottom') */
  mobileImagePosition?: 'top' | 'bottom';
  /** Optional alt text for the image (defaults to title if not provided) */
  imageAlt?: string;
  /** Text alignment for content ('left' | 'center' | 'right') */
  textAlign?: 'left' | 'center' | 'right';
  /** Image object fit style ('cover' | 'contain' | 'fill' | 'none' | 'scale-down') */
  imageObjectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Custom image size (overrides default responsive sizing) */
  imageSize?: {
    width?: string;
    height?: string;
  };
  /** Content to render after the main grid section */
  afterContent?: React.ReactNode;
  /** Center the entire section content */
  centerSection?: boolean;
  /** Optional container class name for additional styling */
  containerClassName?: string;
  /** Optional title class name for additional styling */
  titleClassName?: string;
  /** Optional description class name for additional styling */
  descriptionClassName?: string;
  /** Optional image class name for additional styling */
  imageClassName?: string;
}

/**
 * Reusable HeroSection component with responsive design and customizable layout
 */
export const HeroSection: React.FC<HeroSectionProps> = ({
  imageName,
  title,
  description,
  children,
  hideImageOnMobile = false,
  mobileImagePosition = 'bottom',
  imageAlt,
  textAlign = 'left',
  imageObjectFit = 'cover',
  imageSize,
  afterContent,
  centerSection = false,
  containerClassName,
  titleClassName,
  descriptionClassName,
  imageClassName,
}) => {
  // Determine image visibility classes based on hideImageOnMobile prop
  const imageVisibilityClasses = hideImageOnMobile ? 'hidden lg:block' : 'block';

  // Determine text alignment classes
  const textAlignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[textAlign];

  // Determine image size classes
  const imageSizeClasses = imageSize ? '' : 'h-[300px] md:h-[400px] lg:h-[500px]';

  // Custom image sizing styles
  const imageStyles = imageSize
    ? {
        width: imageSize.width || 'auto',
        height: imageSize.height || 'auto',
      }
    : {};

  // Content section with title, subtitle, description, and children
  const ContentSection = () => (
    <div className={cn('animate-fade-in flex flex-col gap-6 lg:gap-8', textAlignmentClasses)}>
      <h1
        className={cn(
          'font-varela text-green-dark text-3xl leading-tight font-bold md:text-4xl lg:text-5xl',
          titleClassName,
        )}
      >
        {title}
      </h1>
      <p className={cn('font-varela text-lg text-gray-800 md:text-xl', descriptionClassName)}>
        {description}
      </p>
      {children && <div className="flex flex-col gap-4">{children}</div>}
    </div>
  );

  // Image section with responsive sizing
  const ImageSection = () => {
    if (imageSize) {
      // Custom sized image - use explicit width/height
      return (
        <div
          className={cn(
            'animate-float flex items-center justify-center',
            imageVisibilityClasses,
            imageClassName,
          )}
        >
          <div className="relative" style={imageStyles}>
            <Image
              src={imageName}
              alt={imageAlt || title}
              width={parseInt(imageSize.width || '240')}
              height={parseInt(imageSize.height || '240')}
              className={cn('rounded-lg', `object-${imageObjectFit}`)}
              priority
            />
          </div>
        </div>
      );
    }

    // Default responsive image with fill
    return (
      <div
        className={cn(
          'animate-float relative',
          imageSizeClasses,
          imageVisibilityClasses,
          imageClassName,
        )}
      >
        <Image
          src={imageName}
          alt={imageAlt || title}
          fill
          className={cn('rounded-lg', `object-${imageObjectFit}`)}
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    );
  };

  return (
    <section className="" aria-labelledby="hero-title">
      <div
        className={cn(
          'container mx-auto px-4 sm:px-6 lg:px-8',
          centerSection && 'flex flex-col items-center',
          containerClassName,
        )}
      >
        {/* Desktop Layout: Always image on right, content on left */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
          <ContentSection />
          <ImageSection />
        </div>

        {/* Mobile Layout: Conditional based on mobileImagePosition and hideImageOnMobile */}
        <div className="lg:hidden">
          {!hideImageOnMobile && mobileImagePosition === 'top' && (
            <div className="mb-8">
              <ImageSection />
            </div>
          )}

          <ContentSection />

          {!hideImageOnMobile && mobileImagePosition === 'bottom' && (
            <div className="mt-8">
              <ImageSection />
            </div>
          )}
        </div>

        {/* After content section */}
        {afterContent && <div className="mt-6">{afterContent}</div>}
      </div>
    </section>
  );
};

// Export the props interface for external use
export type { HeroSectionProps };
