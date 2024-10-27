// app/api/uploadFile/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
});

export async function POST(request) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'Logo_TD_Brand_Corner.pdf');
      
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
  
      const fileStream = fs.createReadStream(filePath);
      
      const file = await openai.files.create({
        file: fileStream,
        purpose: "assistants"
      });
  
      return NextResponse.json({ 
        success: true,
        fileId: file.id,
        fileName: file.filename,
        status: file.status
      });
  
    } catch (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }