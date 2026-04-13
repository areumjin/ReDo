import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

type LoadState = 'direct' | 'proxy' | 'error'

function toProxyUrl(src: string): string {
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&output=webp&maxage=7d`
}

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [loadState, setLoadState] = useState<LoadState>('direct')

  const { src, alt, style, className, ...rest } = props

  const handleError = () => {
    if (loadState === 'direct' && src) {
      // 직접 로드 실패 → wsrv.nl 프록시로 재시도 (CORS 우회)
      setLoadState('proxy')
    } else {
      setLoadState('error')
    }
  }

  if (loadState === 'error' || !src) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
        </div>
      </div>
    )
  }

  const imgSrc = loadState === 'proxy' ? toProxyUrl(src) : src

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  )
}
