import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sanitizeBlogHTML, isValidSlug, isValidUUID } from '../../../lib/security';
import { BLOG_CATEGORIES } from '../../../types/index';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAdmin(request: Request): Promise<{ user: any; error?: string }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { user: null, error: 'Unauthorized' };

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { user: null, error: 'Invalid token' };

  const { data: application } = await supabase
    .from('applications')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!application || application.role !== 'admin') {
    return { user: null, error: 'Admin access required' };
  }

  return { user };
}

/**
 * GET /api/blog/[id]
 * Admin: get a single blog post by ID (including drafts)
 */
export const GET: APIRoute = async ({ params, request }) => {
  try {
    const { error: authErr } = await verifyAdmin(request);
    if (authErr) {
      return new Response(JSON.stringify({ error: authErr }), {
        status: authErr === 'Admin access required' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;
    if (!id || !isValidUUID(id)) {
      return new Response(JSON.stringify({ error: 'Invalid post ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, post }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Get blog post error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * PUT /api/blog/[id]
 * Admin: update a blog post
 */
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { error: authErr } = await verifyAdmin(request);
    if (authErr) {
      return new Response(JSON.stringify({ error: authErr }), {
        status: authErr === 'Admin access required' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;
    if (!id || !isValidUUID(id)) {
      return new Response(JSON.stringify({ error: 'Invalid post ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch existing post
    const { data: existing, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { title, slug, description, content, featured_image, category, tags, status, author_name } = body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (featured_image !== undefined) updateData.featured_image = featured_image || null;
    if (tags !== undefined) updateData.tags = tags;
    if (author_name !== undefined) updateData.author_name = author_name?.trim() || null;

    if (slug !== undefined) {
      if (!isValidSlug(slug)) {
        return new Response(JSON.stringify({
          error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      updateData.slug = slug.trim();
    }

    if (content !== undefined) {
      updateData.content = sanitizeBlogHTML(content);
    }

    if (category !== undefined) {
      if (!BLOG_CATEGORIES.includes(category)) {
        return new Response(JSON.stringify({
          error: `Invalid category. Must be one of: ${BLOG_CATEGORIES.join(', ')}`,
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      updateData.category = category;
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      updateData.status = status;

      // Auto-set published_at when transitioning to published
      if (status === 'published' && existing.status !== 'published') {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { data: post, error: updateError } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        return new Response(JSON.stringify({ error: 'A post with this slug already exists' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to update post: ' + updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, post }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Update blog post error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * DELETE /api/blog/[id]
 * Admin: delete a blog post
 */
export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const { error: authErr } = await verifyAdmin(request);
    if (authErr) {
      return new Response(JSON.stringify({ error: authErr }), {
        status: authErr === 'Admin access required' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;
    if (!id || !isValidUUID(id)) {
      return new Response(JSON.stringify({ error: 'Invalid post ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: deleteError } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return new Response(JSON.stringify({ error: 'Failed to delete post: ' + deleteError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Post deleted' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Delete blog post error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
