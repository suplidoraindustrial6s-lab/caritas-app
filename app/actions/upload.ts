'use server'

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function uploadBeneficiaryPhoto(formData: FormData) {
    try {
        const file = formData.get('file') as File
        if (!file) {
            return { success: false, error: 'No file uploaded' }
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure upload directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'beneficiaries')
        await mkdir(uploadDir, { recursive: true })

        // Generate unique filename
        const uniqueSuffix = `${uuidv4()}-${file.name.replace(/\s/g, '-')}`
        const filename = uniqueSuffix
        const filepath = join(uploadDir, filename)

        // Write file
        await writeFile(filepath, buffer)

        return {
            success: true,
            url: `/uploads/beneficiaries/${filename}`
        }
    } catch (error) {
        console.error('Error uploading file:', error)
        return { success: false, error: 'Error uploading file' }
    }
}
