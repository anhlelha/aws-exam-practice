import express from 'express';
import multer from 'multer';
import path from 'path';
import { processUploadedPdf } from '../services/pdfProcessor.js';

const router = express.Router();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// POST /api/upload - Upload and process PDF
router.post('/', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const result = await processUploadedPdf(req.file.path, req.file.originalname);
        res.json({
            success: true,
            message: 'PDF processed successfully',
            ...result
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/upload/status/:jobId - Get processing status
router.get('/status/:jobId', (req, res) => {
    // TODO: Implement job status tracking
    res.json({ status: 'processing', progress: 50 });
});

export default router;
