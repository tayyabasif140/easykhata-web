
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

  React.useEffect(() => {
    if (typeof src === 'string') {
      setImgSrc(src);
      setIsLoading(true);
      setHasError(false);
    }
  }, [src]);

  return (
    <>
      {imgSrc && !hasError && (
        <AvatarPrimitive.Image
          ref={ref}
          src={imgSrc}
          className={cn("aspect-square h-full w-full", 
            isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300", 
            className
          )}
          onLoad={() => {
            console.log("Avatar image loaded successfully:", imgSrc);
            setIsLoading(false);
          }}
          onError={(e) => {
            console.error("Avatar image failed to load:", imgSrc, e);
            setHasError(true);
            setIsLoading(false);
            // Set fallback to be displayed
            const imgElement = e.currentTarget as HTMLImageElement;
            imgElement.style.display = 'none';
          }}
          {...props}
        />
      )}
      {(isLoading || hasError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {isLoading && !hasError && (
            <div className="h-1/3 w-1/3 animate-pulse rounded-full bg-muted-foreground/30" />
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
