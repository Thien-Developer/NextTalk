import dynamic from 'next/dynamic'

const ConversationPage = dynamic(() => import('./ConversationPage'), { ssr: false })

export async function generateStaticParams() {
  return process.env.NEXT_BUILD_TARGET === 'electron' ? [{ id: '_' }] : []
}

export default function Page() {
  return <ConversationPage />
}
