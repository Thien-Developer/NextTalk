// Server component wrapper — exports generateStaticParams for Electron static export.
// The actual client logic is in ConversationPage.tsx.
import ConversationPage from './ConversationPage'

// When building for Electron (output: 'export'), generate a single placeholder route
// so electron's protocol handler can serve it for any /chat/:id URL.
// For regular web deployment this returns [] so dynamic routes are server-rendered normally.
export async function generateStaticParams() {
  return process.env.NEXT_BUILD_TARGET === 'electron' ? [{ id: '_' }] : []
}

export default function Page() {
  return <ConversationPage />
}
