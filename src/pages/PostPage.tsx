import { useParams } from 'react-router-dom'
import { FeedPost } from '../components/feed/FeedPost'
import { BackButton } from '../components/layout/BackButton'
import { useApp } from '../hooks/useApp'
import { postService } from '../services/postService'

export function PostPage() {
  const { id = '' } = useParams()
  const { user, refresh } = useApp()
  const post = postService.list().find((p) => p.id === id)
  if (!user) return null

  return (
    <div className="mx-auto max-w-xl anim-page">
      <header className="sticky top-0 z-20 flex h-12 items-center gap-1 bg-ink/90 px-1 backdrop-blur-xl">
        <BackButton />
        <h1 className="text-[18px] font-bold">Gönderi</h1>
      </header>
      {post && !post.archived ? (
        <FeedPost post={post} meId={user.id} onChange={refresh} />
      ) : (
        <p className="px-6 py-16 text-center text-sm text-mute">Gönderi bulunamadı.</p>
      )}
    </div>
  )
}
