import React from 'react'

interface SkeletonCardProps {
  variant?: 'portrait' | 'landscape' | 'row'
  count?: number
}

// All styles outside render
const wrapPortrait: React.CSSProperties = {
  flexShrink: 0,
  width: 144,
}
const thumbPortrait: React.CSSProperties = {
  width: 144,
  aspectRatio: '2/3',
  backgroundColor: '#1A1A2E',
  borderRadius: 12,
  marginBottom: 8,
}
const wrapLandscape: React.CSSProperties = {
  flexShrink: 0,
  width: 224,
}
const thumbLandscape: React.CSSProperties = {
  width: 224,
  aspectRatio: '16/9',
  backgroundColor: '#1A1A2E',
  borderRadius: 12,
  marginBottom: 8,
}
const titleBar: React.CSSProperties = {
  height: 12,
  backgroundColor: '#141420',
  borderRadius: 6,
  marginBottom: 6,
  width: '80%',
}
const subBar: React.CSSProperties = {
  height: 10,
  backgroundColor: '#141420',
  borderRadius: 5,
  width: '55%',
}
const wrapRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 0',
  borderBottom: '1px solid #141420',
}
const thumbRow: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 8,
  backgroundColor: '#1A1A2E',
  flexShrink: 0,
}
const rowTextWrap: React.CSSProperties = {
  flex: 1,
}
const rowTitleBar: React.CSSProperties = {
  height: 12,
  backgroundColor: '#1A1A2E',
  borderRadius: 6,
  marginBottom: 6,
  width: '70%',
}
const rowSubBar: React.CSSProperties = {
  height: 10,
  backgroundColor: '#141420',
  borderRadius: 5,
  width: '45%',
}

function PortraitSkeleton() {
  return (
    <div style={wrapPortrait}>
      <div style={thumbPortrait} />
      <div style={titleBar} />
      <div style={subBar} />
    </div>
  )
}

function LandscapeSkeleton() {
  return (
    <div style={wrapLandscape}>
      <div style={thumbLandscape} />
      <div style={titleBar} />
      <div style={subBar} />
    </div>
  )
}

function RowSkeleton() {
  return (
    <div style={wrapRow}>
      <div style={thumbRow} />
      <div style={rowTextWrap}>
        <div style={rowTitleBar} />
        <div style={rowSubBar} />
      </div>
    </div>
  )
}

export default function SkeletonCard({
  variant = 'landscape',
  count = 1,
}: SkeletonCardProps) {
  const items = Array.from(
    { length: count }, (_, i) => i)
  return (
    <>
      {items.map(i => (
        <React.Fragment key={i}>
          {variant === 'portrait' && (
            <PortraitSkeleton />)}
          {variant === 'landscape' && (
            <LandscapeSkeleton />)}
          {variant === 'row' && (
            <RowSkeleton />)}
        </React.Fragment>
      ))}
    </>
  )
}

