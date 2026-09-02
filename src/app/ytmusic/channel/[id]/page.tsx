import YTMusicChannelClient from './YTMusicChannelClient'

export function generateStaticParams() {
  return [{ id: 'default' }]
}

export default function YTMusicChannelPage(props: { params: Promise<{ id: string }> }) {
  return <YTMusicChannelClient params={props.params} />
}
