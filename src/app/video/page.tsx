'use client'
import { useState, useRef, useEffect } from 'react'
import { useVideoPlayer } from '@/hooks/useVideoPlayer'
import VideoFileBrowser from '@/components/video/VideoFileBrowser'
import VideoPlayerScreen from '@/components/video/VideoPlayerScreen'
import {
  saveVideoFiles,
  loadVideoFiles,
} from '@/lib/fileStore'

export default function VideoPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const player = useVideoPlayer()

  const [activeTab, setActiveTab] = useState<'videos' | 'recent'>('videos')
  const [showPlayer, setShowPlayer] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)

  useEffect(() => {
    const loadSaved = async () => {
      const saved = await loadVideoFiles()
      if (saved.length > 0) {
        const files = saved
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(sf => sf.file)
        await player.loadFiles(files)
      }
    }
    loadSaved()
  }, [player.loadFiles])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const selectedFiles = Array.from(e.target.files)
      await saveVideoFiles(selectedFiles)
      const allSaved = await loadVideoFiles()
      const files = allSaved
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(sf => sf.file)
      await player.loadFiles(files)
      e.target.value = ''
    }
  }

  const handlePlayFile = (index: number) => {
    player.playFile(index)
    setShowPlayer(true)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      {/* FULLSCREEN CUSTOM PLAYER SCREEN VIEW */}
      {showPlayer && player.currentFile && (
        <div className="fixed inset-0 z-[90] bg-black" id="fullscreen-video-overlay">
          <VideoPlayerScreen player={player} onBack={() => setShowPlayer(false)} />
        </div>
      )}

      {/* MODULAR PLAYIT-STYLE FILE LIST BROWSER */}
      <VideoFileBrowser
        player={player}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        isSelectMode={isSelectMode}
        setIsSelectMode={setIsSelectMode}
        onSelectFilesClick={triggerFileInput}
        onPlayFile={handlePlayFile}
      />

      {/* HIDDEN BROWSER HARDWARE INTEGRATION FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id="hidden-browser-file-input"
      />
    </>
  )
}
