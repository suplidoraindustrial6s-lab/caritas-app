import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
    // Await params if necessary (Next.js 15), but for now treat as object or let auto-handling work
    const p = params;

    // Construct path from public/uploads
    // Route: /api/images/beneficiaries/file.jpg -> params.path = ['beneficiaries', 'file.jpg']
    const safePath = path.join(process.cwd(), 'public', 'uploads', ...p.path);

    // Security check: ensure we stay within public/uploads
    if (!safePath.startsWith(path.join(process.cwd(), 'public', 'uploads'))) {
        return new NextResponse('Access Denied', { status: 403 });
    }

    if (!fs.existsSync(safePath)) {
        return new NextResponse('File not found', { status: 404 });
    }

    try {
        const fileBuffer = fs.readFileSync(safePath);
        const ext = path.extname(safePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.webp') contentType = 'image/webp';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'no-store, must-revalidate', // Important for immediate display
            },
        });
    } catch (e) {
        return new NextResponse('Error reading file', { status: 500 });
    }
}
