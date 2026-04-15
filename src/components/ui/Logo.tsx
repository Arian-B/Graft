import React from 'react'

type LogoProps = {
  size?: number
  inverted?: boolean // Unused for image based logo, kept for prop compatibility
}

export default function Logo({ size = 28 }: LogoProps) {
  return (
    <img 
      src="/graftlogo.png" 
      alt="Graft Logo" 
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0
      }} 
    />
  )
}
