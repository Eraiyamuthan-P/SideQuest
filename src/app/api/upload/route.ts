import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Check size and type
    const isImage = file.type.startsWith('image/');
    const maxImageSize = 5 * 1024 * 1024; // 5MB
    const maxDocSize = 10 * 1024 * 1024;  // 10MB

    if (isImage) {
      if (file.size > maxImageSize) {
        return NextResponse.json({ error: 'Image size exceeds the 5MB limit.' }, { status: 400 });
      }
      
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedImageTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Only JPEG, JPG, and PNG image formats are supported.' }, { status: 400 });
      }
    } else {
      if (file.size > maxDocSize) {
        return NextResponse.json({ error: 'Document size exceeds the 10MB limit.' }, { status: 400 });
      }

      const allowedDocTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!allowedDocTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Only PDF, DOC, and DOCX document formats are supported.' }, { status: 400 });
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure public/uploads directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // already exists or created
    }

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}-${safeName}`;
    const filepath = join(uploadDir, filename);

    // Save file
    await writeFile(filepath, buffer);
    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      name: file.name,
      type: file.type,
      size: file.size,
    });

  } catch (error) {
    console.error('File upload API error:', error);
    return NextResponse.json({ error: 'Internal server error during upload.' }, { status: 500 });
  }
}
