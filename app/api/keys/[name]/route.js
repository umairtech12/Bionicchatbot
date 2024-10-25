import { NextResponse } from 'next/server';
import { supabase } from '@/app/src/lib/supabase';
import CryptoJS from 'crypto-js';
import { headers } from 'next/headers';

const SECRET_KEY = process.env.SECRET_KEY;
const MANAGER_KEY = process.env.MANAGER_KEY;

// Decrypt API key
function checkManagerKey(requestHeaders) {
    const managerKey = requestHeaders.get('x-manager-key');
    return managerKey === MANAGER_KEY;
}

function decryptApiKey(encryptedKey) {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}

export async function GET(request, { params }) {
    try {
        // Check manager key
        const headersList = headers();
        if (!checkManagerKey(headersList)) {
            return NextResponse.json(
                { message: 'Invalid manager key.' },
                { status: 403 }
            );
        }

        // Get API key from database
        const { data, error } = await supabase
            .from('api_keys')
            .select()
            .eq('name', params.name)
            .single();

        if (error) {
            return NextResponse.json(
                { message: 'API key not found.' },
                { status: 404 }
            );
        }

        // Decrypt key
        const decryptedKey = decryptApiKey(data.key);
        
        return NextResponse.json({ 
            name: data.name,
            key: decryptedKey
        });
    } catch (error) {
        console.error('Error retrieving key:', error);
        return NextResponse.json(
            { 
                message: 'Error retrieving key',
                error: error.message
            },
            { status: 500 }
        );
    }
}