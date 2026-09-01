import ChannelClient from './ChannelClient'

export function generateStaticParams() {
  return [{ id: 'default' }]
}

export default function ChannelPage(props: { params: Promise<{ id: string }> }) {
  return <ChannelClient params={props.params} />
}
