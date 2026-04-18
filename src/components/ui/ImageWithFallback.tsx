import { ImgHTMLAttributes, useState } from "react";

type ImageWithFallbackProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  fallbackSrc?: string;
};

const ImageWithFallback = ({
  src,
  fallbackSrc = "/placeholder.svg",
  alt,
  onError,
  ...props
}: ImageWithFallbackProps) => {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = failed ? fallbackSrc : src;

  return (
    <img
      {...props}
      src={resolvedSrc}
      alt={alt ?? ""}
      onError={(event) => {
        if (!failed && src !== fallbackSrc) {
          setFailed(true);
        }
        onError?.(event);
      }}
    />
  );
};

export default ImageWithFallback;
