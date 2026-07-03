import type { Metadata } from 'next'
import BlogPostForm from '../BlogPostForm'

export const metadata: Metadata = {
  title: 'New Blog Post — Admin',
  robots: { index: false, follow: false },
}

export default function NewBlogPostPage() {
  return <BlogPostForm />
}
