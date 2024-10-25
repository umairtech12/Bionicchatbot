import { NextResponse } from 'next/server';
import { supabase } from '@/app/src/lib/supabase'; 
import CryptoJS from 'crypto-js';
import { headers } from 'next/headers';

const SECRET_KEY = process.env.SECRET_KEY;
const MANAGER_KEY = process.env.MANAGER_KEY;

// Middleware function to check manager key
async function checkManagerKey(requestHeaders) {
  const managerKey = requestHeaders.get('x-manager-key');
  if (managerKey !== MANAGER_KEY) {
    return false;
  }
  return true;
}

// Encrypt API key
function encryptApiKey(key) {
  return CryptoJS.AES.encrypt(key, SECRET_KEY).toString();
}

// POST /api/keys
export async function POST(request) {
    try {
        // Check manager key
        const headersList = headers();
        if (!checkManagerKey(headersList)) {
            return NextResponse.json(
                { message: 'Invalid manager key.' },
                { status: 403 }
            );
        }

        // Get request body
        const body = await request.json();
        const { name, key } = body;

        // Validate input
        if (!name || !key) {
            return NextResponse.json(
                { message: 'Name and key are required.' },
                { status: 400 }
            );
        }

        // Encrypt key
        const encryptedKey = encryptApiKey(key);

        // Insert into database
        const { data, error } = await supabase
            .from('api_keys')
            .insert([
                { name, key: encryptedKey }
            ])
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            throw error;
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('Error creating key:', error);
        return NextResponse.json(
            { 
                message: 'Error creating API key',
                error: error.message
            },
            { status: 500 }
        );
    }
}