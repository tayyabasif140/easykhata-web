
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => {
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(
    typeof src === 'string' ? src : undefined
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const maxRetries = 1; // Reduced from 3 to 1 for faster fallback

  React.useEffect(() => {
    if (typeof src === 'string') {
      // Add timestamp to URL to prevent caching
      const timestamp = new Date().getTime();
      const newSrc = src.indexOf('?') === -1 ? `${src}?t=${timestamp}` : `${src}&t=${timestamp}`;
      
      setImgSrc(newSrc);
      setIsLoading(true);
      setHasError(false);
      setRetryCount(0); // Reset retry count when src changes
      console.log("Setting image source with cache busting:", newSrc);
    }
  }, [src]);

  // Add auto-retry logic with shorter timeouts
  React.useEffect(() => {
    if (hasError && retryCount < maxRetries) {
      const timer = setTimeout(() => {
        console.log(`Retrying image load (${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        setHasError(false);
        setIsLoading(true);
        
        // Add timestamp to URL to prevent caching on retry
        if (imgSrc) {
          const timestamp = new Date().getTime();
          const newSrc = imgSrc.indexOf('?') === -1 
            ? `${imgSrc}?t=${timestamp}&retry=${retryCount + 1}` 
            : `${imgSrc}&t=${timestamp}&retry=${retryCount + 1}`;
          setImgSrc(newSrc);
        }
      }, 500); // Reduced from exponential backoff to fixed 500ms
      
      return () => clearTimeout(timer);
    } else if (hasError) {
      // Show fallback immediately after max retries
      setIsLoading(false);
    }
  }, [hasError, retryCount, imgSrc]);

  return (
    <>
      {imgSrc && !hasError && (
        <AvatarPrimitive.Image
          ref={ref}
          src={imgSrc}
          className={cn("aspect-square h-full w-full", 
            isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-200", 
            className
          )}
          loading="eager" // Add eager loading
          onLoad={() => {
            console.log("Avatar image loaded successfully");
            setIsLoading(false);
          }}
          onError={(e) => {
            console.error("Avatar image failed to load:", imgSrc);
            setHasError(true);
            setIsLoading(false);
          }}
          {...props}
        />
      )}
      {(isLoading || hasError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {isLoading && !hasError ? (
            <div className="h-1/3 w-1/3 animate-pulse rounded-full bg-muted-foreground/30" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {props.alt?.charAt(0) || '?'}
            </div>
          )}
        </div>
      )}
    </>
  )
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
