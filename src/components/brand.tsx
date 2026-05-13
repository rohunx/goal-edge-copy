type BrandMarkProps = {
  compact?: boolean;
  className?: string;
  imageClassName?: string;
};

export function BrandMark({ compact = false, className = "", imageClassName = "" }: BrandMarkProps) {
  return (
    <div className={`flex items-center min-w-0 ${compact ? "" : "w-full"} ${className}`}>
      {compact ? (
        <img src="/icon.png" alt="ForecastDIY" className={`h-9 w-9 shrink-0 rounded-md object-contain ${imageClassName}`} />
      ) : (
        <img src="/logo.png" alt="ForecastDIY" className={`h-auto w-full max-w-full shrink-0 object-contain ${imageClassName}`} />
      )}
    </div>
  );
}