import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sanitizeBlogHTML, isValidSlug } from '../../lib/security';
import { BLOG_CATEGORIES } from '../../types/index';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/blog
 * Public: list published blog posts with pagination, category filter, search
 * Query params: category, search, page, limit
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('blog_posts')
      .select('id, title, slug, description, featured_image, category, tags, author_name, published_at, created_at', { count: 'exact' })
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category && category !== 'All Posts') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: posts, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch posts: ' + error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Get blog posts error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * POST /api/blog
 * Admin only: create a new blog post
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: application } = await supabase
      .from('applications')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!application || application.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { title, slug, description, content, featured_image, category, tags, status, author_name } = body;

    if (!title || !slug || !content || !category) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: title, slug, content, category',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isValidSlug(slug)) {
      return new Response(JSON.stringify({
        error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!BLOG_CATEGORIES.includes(category)) {
      return new Response(JSON.stringify({
        error: `Invalid category. Must be one of: ${BLOG_CATEGORIES.join(', ')}`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const postStatus = status || 'draft';
    const sanitizedContent = sanitizeBlogHTML(content);

    const insertData: any = {
      title: title.trim(),
      slug: slug.trim(),
      description: description?.trim() || null,
      content: sanitizedContent,
      featured_image: featured_image || null,
      category,
      tags: tags || null,
      author_id: user.id,
      author_name: author_name?.trim() || user.email,
      status: postStatus,
    };

    if (postStatus === 'published') {
      insertData.published_at = new Date().toISOString();
    }

    const { data: post, error: insertError } = await supabase
      .from('blog_posts')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ error: 'A post with this slug already exists' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to create post: ' + insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, post }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Create blog post error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
