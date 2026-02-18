import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const BUCKET = 'blog-images';

/**
 * POST /api/blog/upload-image
 * Admin only: upload an image for blog posts
 * Accepts multipart form data with a "file" field
 * Returns the public URL of the uploaded image
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({
        error: `Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP, GIF`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return new Response(JSON.stringify({
        error: `File too large. Maximum size is 5MB.`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedName = file.name
      .replace(/\.[^/.]+$/, '') // remove extension
      .replace(/[^a-zA-Z0-9-_]/g, '_') // sanitize
      .substring(0, 50); // limit length
    const filePath = `${timestamp}-${sanitizedName}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: '31536000', // 1 year cache
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return new Response(JSON.stringify({
        error: 'Upload failed: ' + uploadError.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(uploadData.path);

    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      path: uploadData.path,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Blog image upload error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
