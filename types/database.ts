// types/database.ts — auto-generated types (simplified manual version)
// Run: npx supabase gen types typescript --project-id YOUR_ID > types/database.ts

export type ProductStatus      = 'draft' | 'active' | 'archived' | 'scheduled'
export type OrderStatus        = 'pending' | 'processing' | 'completed' | 'refunded' | 'cancelled'
export type UserRole           = 'customer' | 'admin' | 'super_admin'
export type DeliveryType       = 'digital' | 'printable' | 'bundle'
export type ReviewStatus       = 'pending' | 'approved' | 'rejected'
export type BlogStatus         = 'draft' | 'published' | 'archived'
export type NotebookType       = 'general' | 'custom'
export type NotebookStatus     = 'active' | 'draft'
export type NotebookVisibility = 'private' | 'shared' | 'public'
export type CollaboratorRole   = 'editor' | 'viewer'

export interface Category {
  id: string
  name: string
  name_fr: string | null
  slug: string
  description: string | null
  icon: string | null
  image_url: string | null
  sort_order: number
  is_featured: boolean
  created_at: string
}

export type PlannerSize = 'a4' | 'a5' | 'us_letter'

export interface PlannerFile {
  url: string       // Supabase Storage path (private bucket)
  size_mb: number
  name: string      // original uploaded filename
}

// Up to three planner files per product, one per paper size.
export type PlannerFiles = Partial<Record<PlannerSize, PlannerFile>>

export interface Product {
  id: string
  title: string
  title_fr: string | null
  slug: string
  description: string | null
  description_fr: string | null
  category_id: string | null
  status: ProductStatus
  delivery_type: DeliveryType
  price: number
  compare_price: number | null
  currency: string
  images: string[]
  preview_pages: string[]
  thumbnail: string | null
  file_url: string | null
  file_size_mb: number | null
  planner_files: PlannerFiles
  file_formats: string[]
  page_count: number | null
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string[] | null
  download_count: number
  view_count: number
  rating_avg: number
  rating_count: number
  is_featured: boolean
  is_bestseller: boolean
  is_new: boolean
  is_bundle: boolean
  bundle_items: string[] | null
  tags: string[]
  display_order: number | null
  published_at: string | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface Review {
  id: string
  product_id: string
  user_id: string | null
  reviewer_name: string
  rating: number
  title: string | null
  body: string | null
  verified: boolean
  status: ReviewStatus
  helpful_count: number
  created_at: string
}

export interface Order {
  id: string
  user_id: string | null
  email: string
  status: OrderStatus
  stripe_payment_intent: string | null
  paypal_order_id: string | null
  payment_method: string | null
  amount_subtotal: number
  amount_discount: number
  amount_total: number
  currency: string
  coupon_code: string | null
  download_tokens: Record<string, string> | null
  downloads_expire: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  title: string
  price: number
  quantity: number
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  locale: string
  wishlist: string[]
  created_at: string
  updated_at: string
}

export interface BlogPost {
  id: string
  title: string
  title_fr: string | null
  slug: string
  excerpt: string | null
  body: string | null
  cover_image: string | null
  author_id: string | null
  status: BlogStatus
  tags: string[]
  category: string | null
  meta_title: string | null
  meta_description: string | null
  read_time_mins: number | null
  view_count: number
  published_at: string | null
  created_at: string
}

export interface Coupon {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  min_order: number
  max_uses: number | null
  used_count: number
  is_active: boolean
  expires_at: string | null
}

export interface Notebook {
  id: string
  name: string
  type: NotebookType
  description: string | null
  cover_color: string
  owner_id: string
  status: NotebookStatus
  visibility: NotebookVisibility
  last_edited_by: string | null
  created_at: string
  updated_at: string
  owner?: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>
  last_editor?: Pick<Profile, 'id' | 'email' | 'full_name'> | null
  collaborators?: NotebookCollaborator[]
}

export interface NotebookCollaborator {
  id: string
  notebook_id: string
  user_id: string
  role: CollaboratorRole
  invited_by: string | null
  invited_at: string
  accepted_at: string | null
  profiles?: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>
}

export type NavLocation = 'header' | 'footer_shop' | 'footer_company' | 'footer_support'

export interface Testimonial {
  id: string
  name: string
  role: string | null
  quote: string
  rating: number
  product_label: string | null
  gradient: string | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface NavLink {
  id: string
  label: string
  href: string
  location: NavLocation
  parent_id: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SiteSetting {
  key: string
  value: unknown
  updated_at?: string
}

export interface PlannerTemplate {
  id: string
  name: string
  slug: string
  description: string | null
  template_key: string
  accent_hex: string | null
  price: number
  compare_price: number | null
  category_slug: string
  page_count: number | null
  is_active: boolean
  sort_order: number
  last_generated_at: string | null
  product_id: string | null
  created_at: string
  updated_at: string
}

export interface NotebookActivityLog {
  id: string
  notebook_id: string
  user_id: string | null
  action: string
  metadata: Record<string, unknown>
  created_at: string
  profiles?: Pick<Profile, 'id' | 'email' | 'full_name'> | null
}

type R = { Relationships: never[] }

export interface Database {
  public: {
    Tables: {
      profiles:               { Row: Profile;    Insert: Partial<Profile>;    Update: Partial<Profile>    } & R
      categories:             { Row: Category;   Insert: Partial<Category>;   Update: Partial<Category>   } & R
      products:               { Row: Product;    Insert: Partial<Product>;    Update: Partial<Product>    } & R
      reviews:                { Row: Review;     Insert: Partial<Review>;     Update: Partial<Review>     } & R
      orders:                 { Row: Order;      Insert: Partial<Order>;      Update: Partial<Order>      } & R
      order_items:            { Row: OrderItem;  Insert: Partial<OrderItem>;  Update: Partial<OrderItem>  } & R
      coupons:                { Row: Coupon;     Insert: Partial<Coupon>;     Update: Partial<Coupon>     } & R
      blog_posts:             { Row: BlogPost;   Insert: Partial<BlogPost>;   Update: Partial<BlogPost>   } & R
      newsletter_subscribers: { Row: { id: string; email: string; locale: string; source: string | null; is_active: boolean; created_at: string }; Insert: { email: string; locale?: string; source?: string }; Update: { email?: string; locale?: string; source?: string; is_active?: boolean } } & R
      testimonials:           { Row: Testimonial;      Insert: Partial<Testimonial>;      Update: Partial<Testimonial>      } & R
      nav_links:              { Row: NavLink;          Insert: Partial<NavLink>;          Update: Partial<NavLink>          } & R
      site_settings:          { Row: SiteSetting;      Insert: Partial<SiteSetting>;      Update: Partial<SiteSetting>      } & R
      planner_templates:      { Row: PlannerTemplate;  Insert: Partial<PlannerTemplate>;  Update: Partial<PlannerTemplate>  } & R
      notebooks:              { Row: Notebook;             Insert: Partial<Notebook>;             Update: Partial<Notebook>             } & R
      notebook_collaborators: { Row: NotebookCollaborator; Insert: Partial<NotebookCollaborator>; Update: Partial<NotebookCollaborator> } & R
      notebook_activity_log:  { Row: NotebookActivityLog;  Insert: Partial<NotebookActivityLog>;  Update: Partial<NotebookActivityLog>  } & R
    }
    Views:     Record<string, never>
    Functions: Record<string, never>
  }
}
