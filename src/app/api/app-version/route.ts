import { NextResponse } from 'next/server'


const CURRENT_VERSION = '1.0.0'
const GITHUB_REPO =
  'playnexaofficial-glitch/Play-Nexa-Official-'

export async function GET() {
  try {
    // Fetch latest release from GitHub
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PlayNexa/1.0',
        },
        next: { revalidate: 3600 }
      }
    )

    if (!res.ok) {
      return NextResponse.json({
        currentVersion: CURRENT_VERSION,
        latestVersion: CURRENT_VERSION,
        hasUpdate: false,
        downloadUrl: null,
      })
    }

    const release = await res.json()
    const latestVersion: string =
      release.tag_name?.replace('v', '') ||
      CURRENT_VERSION

    // Find APK asset in release
    const apkAsset = release.assets?.find(
      (a: any) => a.name && a.name.endsWith('.apk'))

    return NextResponse.json({
      currentVersion: CURRENT_VERSION,
      latestVersion,
      hasUpdate: latestVersion !== CURRENT_VERSION,
      downloadUrl: apkAsset?.browser_download_url || null,
      releaseNotes: release.body || '',
      publishedAt: release.published_at || null,
    })
  } catch {
    return NextResponse.json({
      currentVersion: CURRENT_VERSION,
      latestVersion: CURRENT_VERSION,
      hasUpdate: false,
      downloadUrl: null,
    })
  }
}
