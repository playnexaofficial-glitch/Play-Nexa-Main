'use client'
import { useState } from 'react'
import { Film, Play, MoreVertical, Search, Trash2, ChevronLeft, CheckSquare, FolderOpen } from 'lucide-react'
import type { useVideoPlayer, VideoFile } from '@/hooks/useVideoPlayer'
import { clearVideoFiles, saveVideoFiles } from '@/lib/fileStore'

type Player = ReturnType<typeof useVideoPlayer>

interface VideoFileBrowserProps {
  player: Player
  activeTab: 'videos' | 'recent'
  setActiveTab: (tab: 'videos' | 'recent') => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  showSearch: boolean
  setShowSearch: (show: boolean) => void
  selectedIds: Set<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  isSelectMode: boolean
  setIsSelectMode: (mode: boolean) => void
  onSelectFilesClick: () => void
  onPlayFile: (index: number) => void
}

export default function VideoFileBrowser({
  player,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch,
  selectedIds,
  setSelectedIds,
  isSelectMode,
  setIsSelectMode,
  onSelectFilesClick,
  onPlayFile,
}: VideoFileBrowserProps) {
  const [selectedMetaFile, setSelectedMetaFile] = useState<VideoFile | null>(null)

  // Filter search matches
  const filteredFiles = player.files.filter(f =>
    f.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Long-press enter select mode
  const handleLongPress = (file: VideoFile) => {
    setIsSelectMode(true)
    setSelectedIds(new Set([file.id]))
  }

  // Row item click handler
  const handleItemClick = (file: VideoFile, index: number) => {
    if (isSelectMode) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(file.id)) {
          next.delete(file.id)
        } else {
          next.add(file.id)
        }
        return next
      })
    } else {
      onPlayFile(index)
    }
  }

  // Multiple item deletion handler
  const handleDeleteSelected = async () => {
    const remaining = player.files.filter(f => !selectedIds.has(f.id))
    setIsSelectMode(false)
    setSelectedIds(new Set())
    await clearVideoFiles()
    if (remaining.length > 0) {
      await saveVideoFiles(remaining.map(r => r.file))
    }
    player.loadFiles(remaining.map(r => r.file))
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col font-sans select-none pb-24" id="video-file-browser">
      {/* Dynamic Header */}
      <div className="sticky top-0 z-40 bg-[#0D0D0D]/95 border-b border-neutral-900 px-4 py-3 flex items-center gap-3">
        {isSelectMode ? (
          <>
            <button
              onClick={() => {
                setIsSelectMode(false)
                setSelectedIds(new Set())
              }}
              className="w-10 h-10 flex items-center justify-center active:opacity-60 cursor-pointer text-white"
              id="browser-cancel-select"
            >
              <ChevronLeft size={24} />
            </button>
            <span className="flex-1 text-white font-bold text-base" id="browser-selected-count">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="w-10 h-10 flex items-center justify-center active:opacity-60 disabled:opacity-30 cursor-pointer text-[#EF4444]"
              id="browser-delete-btn"
            >
              <Trash2 size={20} />
            </button>
          </>
        ) : showSearch ? (
          <>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
              className="flex-1 h-10 bg-neutral-950 border border-neutral-800 rounded-xl px-4 text-white text-sm outline-none placeholder-neutral-600 focus:border-[#7C3AED]"
              autoFocus
              id="browser-search-input"
            />
            <button
              onClick={() => {
                setShowSearch(false)
                setSearchQuery('')
              }}
              className="text-neutral-400 text-xs font-semibold px-2 active:opacity-60 cursor-pointer"
              id="browser-cancel-search"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 flex items-center justify-center active:opacity-60 cursor-pointer text-white"
              id="browser-back-btn"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="flex-1 text-white font-bold text-base tracking-wide" id="browser-title">
              Video Player
            </h1>
            {player.files.length > 0 && (
              <>
                <button
                  onClick={() => setShowSearch(true)}
                  className="w-10 h-10 flex items-center justify-center active:opacity-60 cursor-pointer text-white"
                  id="browser-search-btn"
                >
                  <Search size={18} />
                </button>
                <button
                  onClick={() => setIsSelectMode(true)}
                  className="w-10 h-10 flex items-center justify-center active:opacity-60 cursor-pointer text-white"
                  id="browser-select-mode-btn"
                >
                  <CheckSquare size={18} />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      {player.files.length > 0 && !showSearch && (
        <div className="flex border-b border-neutral-900 px-4" id="browser-tabs-row">
          {(['videos', 'recent'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 -mb-px transition-colors duration-100 active:opacity-60 cursor-pointer ${
                activeTab === tab ? 'text-[#A78BFA] border-[#7C3AED]' : 'text-neutral-500 border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Empty Playlist View */}
      {player.files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-8 flex-1" id="browser-empty-state">
          <div className="w-24 h-24 rounded-3xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mb-6">
            <Film size={36} className="text-[#7C3AED] stroke-[1.5]" />
          </div>
          <h2 className="text-white font-bold text-base mb-1.5">No Videos</h2>
          <p className="text-neutral-400 text-xs text-center mb-8 max-w-xs leading-relaxed">
            Select MP4, MKV, AVI, MOV, or WebM video files from your device to play
          </p>
          {player.error && (
            <div className="bg-red-950/15 border border-red-900/30 rounded-xl p-3.5 mb-6 w-full max-w-sm">
              <p className="text-red-400 text-xs text-center leading-relaxed font-medium">{player.error}</p>
            </div>
          )}
          <button
            onClick={onSelectFilesClick}
            className="flex items-center gap-2.5 px-8 h-12 bg-[#7C3AED] rounded-xl text-white font-semibold text-xs active:opacity-80 transition-opacity duration-150 cursor-pointer"
            id="browser-empty-import"
          >
            <FolderOpen size={16} />
            Select Videos
          </button>
        </div>
      )}

      {/* Populated List */}
      {filteredFiles.length > 0 && (
        <div className="py-2.5 space-y-0.5" style={{ contentVisibility: 'auto' }} id="browser-list-container">
          {filteredFiles.map((file, idx) => {
            const actualIndex = player.files.indexOf(file)
            const isActive = player.currentIndex === actualIndex
            const isSelected = selectedIds.has(file.id)

            return (
              <div
                key={file.id}
                onClick={() => handleItemClick(file, actualIndex)}
                onContextMenu={e => {
                  e.preventDefault()
                  handleLongPress(file)
                }}
                className={`w-full flex items-center gap-4 px-4 py-3 active:opacity-60 transition-opacity duration-150 cursor-pointer border-b border-neutral-950 ${
                  isActive ? 'bg-[#7C3AED]/10' : ''
                } ${isSelected ? 'bg-[#7C3AED]/15' : ''}`}
                id={`browser-item-${idx}`}
              >
                {/* Thumb Host */}
                <div className="w-24 h-14 rounded-xl bg-neutral-950 border border-neutral-900 flex-shrink-0 relative overflow-hidden">
                  {file.thumbnailUrl ? (
                    <img src={file.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film size={20} className="text-neutral-600" />
                    </div>
                  )}

                  {/* Play Overlay indicator */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: isActive ? 'rgba(124, 58, 237, 0.45)' : 'none',
                    }}
                  >
                    {isActive && <Play size={16} className="text-white fill-white" />}
                  </div>

                  {/* Active playing index duration badge */}
                  {isActive && player.duration > 0 && (
                    <div className="absolute bottom-1 right-1 bg-black/80 rounded-md px-1 py-0.5 select-none">
                      <span className="text-white text-[9px] font-mono font-medium">
                        {player.formatTime(player.duration)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Track Details */}
                <div className="flex-1 min-w-0 text-left">
                  <p
                    className={`text-xs font-semibold leading-tight line-clamp-2 mb-1.5 tracking-wide ${
                      isActive ? 'text-[#C084FC]' : 'text-white'
                    }`}
                  >
                    {file.displayName}
                  </p>
                  <p className="text-neutral-500 text-3xs font-medium uppercase font-mono tracking-wider flex flex-wrap gap-x-2 gap-y-1 items-center">
                    <span>{player.formatSize(file.size)}</span>
                    {file.type && <span>• {file.type.replace('video/', '').toUpperCase()}</span>}
                    {file.resolution && (
                      <span className="bg-neutral-900 border border-neutral-800/60 px-1 py-0.5 rounded text-[8px] text-[#A78BFA] font-sans font-extrabold tracking-normal">
                        {file.resolution}
                      </span>
                    )}
                    {file.codec && (
                      <span className="text-neutral-600 font-sans font-medium text-[9px] tracking-tight">
                        ({file.codec})
                      </span>
                    )}
                  </p>
                </div>

                {/* Select checkmark circle or options toggle */}
                {isSelectMode ? (
                  <div
                    className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all duration-100 ${
                      isSelected
                        ? 'bg-[#7C3AED] border-[#7C3AED]'
                        : 'border-neutral-700'
                    }`}
                  >
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <button
                    className="w-8 h-8 flex items-center justify-center active:opacity-60 cursor-pointer text-neutral-400"
                    onClick={e => {
                      e.stopPropagation()
                      setSelectedMetaFile(file)
                    }}
                    aria-label="Options"
                  >
                    <MoreVertical size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Search empty results fallback */}
      {searchQuery && filteredFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 select-none">
          <Search size={32} className="text-neutral-700 mb-3" />
          <p className="text-neutral-400 text-xs">No search results matches for "{searchQuery}"</p>
        </div>
      )}

      {/* Floating Add Files Button */}
      {player.files.length > 0 && (
        <button
          onClick={onSelectFilesClick}
          className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#7C3AED] flex items-center justify-center active:opacity-80 transition-opacity duration-150 z-40 cursor-pointer"
          id="browser-floating-add-btn"
          aria-label="Import files"
        >
          <FolderOpen size={20} color="white" />
        </button>
      )}

      {/* File Information / Metadata Dialog Overlay */}
      {selectedMetaFile && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 transition-opacity duration-200"
          onClick={() => setSelectedMetaFile(null)}
          id="metadata-modal-backdrop"
        >
          <div 
            className="w-full max-w-lg bg-[#121212] rounded-t-2xl border-t border-neutral-800 p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
            id="metadata-modal-content"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
              <div className="min-w-0 flex-1 pr-3">
                <span className="text-[9px] font-extrabold text-[#A78BFA] uppercase tracking-wider block mb-1 font-mono">
                  Video Properties
                </span>
                <h3 className="text-white text-sm font-semibold truncate leading-tight">
                  {selectedMetaFile.displayName}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedMetaFile(null)}
                className="text-white text-xs font-bold px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-lg active:opacity-60 transition-opacity duration-150 cursor-pointer"
                id="metadata-close-btn"
              >
                Close
              </button>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-2 gap-3 my-1">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900 flex flex-col gap-0.5 text-left">
                <span className="text-neutral-500 text-[10px] font-medium tracking-wide">Resolution</span>
                <span className="text-white font-mono font-bold text-xs">
                  {selectedMetaFile.resolution || 'Extracting...'}
                </span>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900 flex flex-col gap-0.5 text-left">
                <span className="text-neutral-500 text-[10px] font-medium tracking-wide">Codec</span>
                <span className="text-[#A78BFA] font-mono font-bold text-xs">
                  {selectedMetaFile.codec || 'Extracting...'}
                </span>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900 flex flex-col gap-0.5 text-left">
                <span className="text-neutral-500 text-[10px] font-medium tracking-wide">File Size</span>
                <span className="text-white font-mono font-semibold text-xs">
                  {player.formatSize(selectedMetaFile.size)}
                </span>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900 flex flex-col gap-0.5 text-left">
                <span className="text-neutral-500 text-[10px] font-medium tracking-wide">File Format</span>
                <span className="text-white font-mono font-semibold text-xs">
                  {selectedMetaFile.type ? selectedMetaFile.type.replace('video/', '').toUpperCase() : selectedMetaFile.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
            </div>

            {/* Full File Name */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900 flex flex-col gap-1 text-left">
              <span className="text-neutral-500 text-[10px] font-medium tracking-wide">Filename</span>
              <span className="text-neutral-300 font-mono text-[10px] break-all select-all leading-normal">
                {selectedMetaFile.name}
              </span>
            </div>

            {/* Play Button Shortcut */}
            <button
              onClick={() => {
                const index = player.files.indexOf(selectedMetaFile)
                if (index >= 0) {
                  onPlayFile(index)
                }
                setSelectedMetaFile(null)
              }}
              className="w-full h-11 bg-[#7C3AED] rounded-xl text-white text-xs font-bold active:opacity-80 transition-opacity duration-150 flex items-center justify-center gap-2 cursor-pointer"
              id="metadata-play-shortcut"
            >
              <Play size={14} className="fill-white text-white" />
              Play Video File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
