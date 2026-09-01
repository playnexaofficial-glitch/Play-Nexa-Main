import GamePlayerClient from './GamePlayerClient'
import gamesData from '@/data/games.json'

export function generateStaticParams() {
  const games = (gamesData.games || []) as any[]
  if (games.length > 0) {
    return games.map((g: any) => ({ id: g.id }))
  }
  return [{ id: 'default' }]
}

export default function GamePlayerPage(props: { params: Promise<{ id: string }> }) {
  return <GamePlayerClient params={props.params} />
}
