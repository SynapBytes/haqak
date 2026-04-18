import { ImgHTMLAttributes, useMemo, useState } from "react";

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
  const resolvedAlt = useMemo(() => alt || "Image", [alt]);

  return (
    <img
      {...props}
      src={resolvedSrc}
      alt={resolvedAlt}
      onError={(event) => {
        if (!failed) {
          setFailed(true);
        }
        onError?.(event);
      }}
    />
  );
};

export default ImageWithFallback;
