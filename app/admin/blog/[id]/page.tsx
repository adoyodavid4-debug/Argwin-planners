import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BlogPostForm, { type BlogFormPost } from '../BlogPostForm'

export const metadata: Metadata = {
  title: 'Edit Blog Post — Admin',
  robots: { index: false, follow: false },
}

export default async function EditBlogPostPage({ params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, body, cover_image, category, tags, read_time_mins, status')
    .eq('id', params.id)
    .single()

  if (!post) notFound()

  return <BlogPostForm post={post as BlogFormPost} />
}
