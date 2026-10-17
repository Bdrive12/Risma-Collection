require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { cert, initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const firebaseConfigKeys = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_DATABASE_URL'
];
const firebaseConfigured = firebaseConfigKeys.every(key => process.env[key]);
const cloudinaryUrl = process.env.CLOUDINARY_URL ? new URL(process.env.CLOUDINARY_URL) : null;
const cloudinaryConfigured = cloudinaryUrl?.protocol === 'cloudinary:' && cloudinaryUrl.hostname && cloudinaryUrl.username && cloudinaryUrl.password;
if (process.env.NODE_ENV === 'production' && !firebaseConfigured) {
    console.error(`Konfigurasi Firebase production belum lengkap: ${firebaseConfigKeys.filter(key => !process.env[key]).join(', ')}`);
    process.exit(1);
}
if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    console.error('SESSION_SECRET harus berisi minimal 32 karakter.');
    process.exit(1);
}

if (firebaseConfigured) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}
if (cloudinaryConfigured) {
    cloudinary.config({
        cloud_name: cloudinaryUrl.hostname,
        api_key: decodeURIComponent(cloudinaryUrl.username),
        api_secret: decodeURIComponent(cloudinaryUrl.password),
        secure: true
    });
}

const app = express();
const database = firebaseConfigured ? getDatabase() : null;
const dataDirectory = path.join(__dirname, '.data');
const localCatalogPath = path.join(dataDirectory, 'catalog.json');
const localPasswordPath = path.join(dataDirectory, 'admin-password.json');
const localSessionSecretPath = path.join(dataDirectory, 'session-secret.json');
const sessionSecret = process.env.SESSION_SECRET || readLocalJSON(localSessionSecretPath, null) || crypto.randomBytes(48).toString('hex');
let localPasswordRecord = firebaseConfigured ? null : readLocalJSON(localPasswordPath, null);
let localAdminPassword = process.env.ADMIN_PASSWORD || '';
fs.mkdirSync(dataDirectory, { recursive: true });
if (!firebaseConfigured && !process.env.SESSION_SECRET && !fs.existsSync(localSessionSecretPath)) {
    fs.writeFileSync(localSessionSecretPath, JSON.stringify(sessionSecret));
}

function readLocalJSON(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return fallback;
    }
}

if (!firebaseConfigured && !localAdminPassword) {
    if (!localPasswordRecord) {
        localAdminPassword = crypto.randomBytes(12).toString('base64url');
        const salt = crypto.randomBytes(16).toString('hex');
        localPasswordRecord = { salt, digest: passwordDigest(localAdminPassword, salt) };
        fs.writeFileSync(localPasswordPath, JSON.stringify(localPasswordRecord));
        console.log(`Kata sandi admin lokal sementara: ${localAdminPassword}`);
    }
}
if (!firebaseConfigured) console.log('Firebase belum dikonfigurasi; katalog disimpan lokal di .data/catalog.json.');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1_500_000 },
    fileFilter: (request, file, callback) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        callback(allowedTypes.includes(file.mimetype) ? null : new Error('Gunakan gambar JPEG, PNG, atau WebP.'), allowedTypes.includes(file.mimetype));
    }
});

app.use(express.json({ limit: '1mb' }));

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function passwordDigest(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString('hex');
}

async function verifyAdminPassword(password) {
    const saved = firebaseConfigured
        ? (await database.ref('_private/adminPassword').get()).val()
        : localPasswordRecord;
    if (saved?.salt && saved?.digest) {
        return safeEqual(passwordDigest(password, saved.salt), saved.digest);
    }
    return safeEqual(password, firebaseConfigured ? process.env.ADMIN_PASSWORD : localAdminPassword);
}

async function getCatalogRecords() {
    const records = firebaseConfigured
        ? (await database.ref('catalog/products').get()).val() || {}
        : readLocalJSON(localCatalogPath, {});
    return migrateLegacyCatalogImages(records);
}

async function saveCatalogRecords(records) {
    if (firebaseConfigured) {
        await database.ref('catalog/products').set(records);
        return;
    }
    await fs.promises.writeFile(localCatalogPath, JSON.stringify(records, null, 2));
}

function signedSession(expiry) {
    const signature = crypto.createHmac('sha256', sessionSecret).update(String(expiry)).digest('hex');
    return `${expiry}.${signature}`;
}

function hasAdminSession(request) {
    const cookie = request.headers.cookie || '';
    const token = cookie.split(';').map(part => part.trim()).find(part => part.startsWith('risma_admin='))?.slice('risma_admin='.length);
    if (!token) return false;
    const [expiry, signature] = token.split('.');
    if (!expiry || !signature || Number(expiry) < Date.now()) return false;
    return safeEqual(signature, signedSession(expiry).split('.')[1]);
}

function requireAdmin(request, response, next) {
    if (!hasAdminSession(request)) return response.status(401).json({ error: 'Sesi admin berakhir. Silakan masuk kembali.' });
    next();
}

function publicProduct(product) {
    return {
        id: product.id,
        name: product.name,
        category: product.category,
        desc: product.desc,
        image: product.image
    };
}

function detectImageMimeType(buffer) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    return '';
}

function uploadCatalogImage(buffer, productId) {
    return new Promise((resolve, reject) => {
        const publicId = `risma-collection/catalog/${productId}-${crypto.randomUUID()}`;
        const stream = cloudinary.uploader.upload_stream({
            public_id: publicId,
            overwrite: false,
            resource_type: 'image'
        }, (error, result) => {
            if (error) return reject(error);
            resolve({ image: result.secure_url, imagePublicId: result.public_id });
        });
        stream.end(buffer);
    });
}

async function migrateLegacyCatalogImages(records) {
    if (!cloudinaryConfigured) return records;
    let changed = false;
    const migratedRecords = { ...records };

    for (const [id, product] of Object.entries(records)) {
        const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(product.image || '');
        if (!match) continue;
        const buffer = Buffer.from(match[2], 'base64');
        if (detectImageMimeType(buffer) !== match[1]) continue;
        try {
            const uploadedImage = await uploadCatalogImage(buffer, id);
            migratedRecords[id] = { ...product, ...uploadedImage };
            changed = true;
        } catch (error) {
            console.error(`Cloudinary migration failed for product ${id}:`, error.message);
        }
    }

    if (changed) await saveCatalogRecords(migratedRecords);
    return migratedRecords;
}

async function deleteCatalogImage(publicId) {
    if (!publicId || !cloudinaryConfigured) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
        console.error(`Cloudinary cleanup failed for ${publicId}:`, error.message);
    }
}

app.post('/api/admin/login', async (request, response, next) => {
    try {
        const password = String(request.body.password || '');
        if (!await verifyAdminPassword(password)) {
            return response.status(401).json({ error: 'Kata sandi admin salah.' });
        }
        const expiry = Date.now() + 12 * 60 * 60 * 1000;
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        response.setHeader('Set-Cookie', `risma_admin=${signedSession(expiry)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`);
        response.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/logout', (request, response) => {
    response.setHeader('Set-Cookie', 'risma_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    response.json({ ok: true });
});

app.post('/api/admin/password', requireAdmin, async (request, response, next) => {
    try {
        const currentPassword = String(request.body.currentPassword || '');
        const newPassword = String(request.body.newPassword || '');
        if (newPassword.length < 8 || newPassword.length > 200) {
            return response.status(400).json({ error: 'Kata sandi baru harus 8 sampai 200 karakter.' });
        }
        if (!await verifyAdminPassword(currentPassword)) {
            return response.status(401).json({ error: 'Kata sandi saat ini tidak cocok.' });
        }
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordRecord = { salt, digest: passwordDigest(newPassword, salt) };
        if (firebaseConfigured) await database.ref('_private/adminPassword').set(passwordRecord);
        else {
            localPasswordRecord = passwordRecord;
            await fs.promises.writeFile(localPasswordPath, JSON.stringify(passwordRecord));
        }
        response.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

app.get('/api/products', async (request, response, next) => {
    try {
        const savedProducts = await getCatalogRecords();
        response.json(Object.values(savedProducts).map(publicProduct));
    } catch (error) {
        next(error);
    }
});

app.put('/api/products', requireAdmin, upload.single('image'), async (request, response, next) => {
    const uploadedPublicIds = [];
    try {
        const inputProducts = JSON.parse(request.body.products || '[]');
        if (!Array.isArray(inputProducts) || inputProducts.length > 100) {
            const error = new Error('Data katalog tidak valid.');
            error.status = 400;
            throw error;
        }
        const oldProducts = await getCatalogRecords();
        const seenIds = new Set();
        const nextProducts = inputProducts.map(input => {
            const id = String(input.id || '');
            const name = String(input.name || '').trim();
            const category = String(input.category || '').trim();
            const desc = String(input.desc || '').trim();
            const oldProduct = oldProducts[id] || {};
            const hasUploadedImage = request.file && String(request.body.imageProductId || '') === id;
            if (!/^[\w-]{1,100}$/.test(id) || seenIds.has(id) || !name || name.length > 100 || !category || category.length > 60 || !desc || desc.length > 300) {
                const error = new Error('Data produk tidak valid. Periksa nama, kategori, dan deskripsi.');
                error.status = 400;
                throw error;
            }
            seenIds.add(id);
            const product = {
                id,
                name,
                category,
                desc,
                image: String(input.image || oldProduct.image || ''),
                imagePublicId: oldProduct.imagePublicId || ''
            };
            if (!hasUploadedImage && !product.image.startsWith('https://') && !product.image.startsWith('data:image/')) {
                const error = new Error(`Foto untuk ${name} belum tersedia.`);
                error.status = 400;
                throw error;
            }
            return product;
        });

        if (request.file) {
            if (!cloudinaryConfigured) {
                return response.status(503).json({ error: 'CLOUDINARY_URL belum dikonfigurasi di file .env.' });
            }
            const imageProductId = String(request.body.imageProductId || '');
            const product = nextProducts.find(item => item.id === imageProductId);
            if (!product) return response.status(400).json({ error: 'Produk untuk foto tidak ditemukan.' });
            const imageMimeType = detectImageMimeType(request.file.buffer);
            if (!imageMimeType || imageMimeType !== request.file.mimetype) {
                return response.status(400).json({ error: 'Isi file bukan gambar JPEG, PNG, atau WebP yang valid.' });
            }
            const uploadedImage = await uploadCatalogImage(request.file.buffer, product.id);
            product.image = uploadedImage.image;
            product.imagePublicId = uploadedImage.imagePublicId;
            uploadedPublicIds.push(uploadedImage.imagePublicId);
        }

        const records = Object.fromEntries(nextProducts.map(product => [product.id, product]));
        await saveCatalogRecords(records);
        uploadedPublicIds.length = 0;
        const retainedPublicIds = new Set(nextProducts.map(product => product.imagePublicId).filter(Boolean));
        await Promise.all(Object.values(oldProducts)
            .map(product => product.imagePublicId)
            .filter(publicId => publicId && !retainedPublicIds.has(publicId))
            .map(deleteCatalogImage));
        response.json({ products: nextProducts.map(publicProduct) });
    } catch (error) {
        await Promise.all(uploadedPublicIds.map(deleteCatalogImage));
        if (error instanceof SyntaxError) return response.status(400).json({ error: 'Data katalog tidak valid.' });
        next(error);
    }
});

app.use(express.static(path.join(__dirname), { dotfiles: 'deny' }));
app.use((error, request, response, next) => {
    console.error(error);
    const status = error.status || (error instanceof multer.MulterError ? 400 : (error.message?.startsWith('Gunakan gambar') ? 400 : 500));
    response.status(status).json({ error: status === 500 ? 'Terjadi kesalahan pada server.' : error.message });
});

const port = Number(process.env.PORT || 3000);
function logServerAddress(server) {
    const address = server.address();
    console.log(`Risma Collection berjalan di http://localhost:${address.port}`);
}

const server = app.listen(port, '127.0.0.1', () => logServerAddress(server));
server.on('error', error => {
    if (error.code !== 'EADDRINUSE') throw error;
    const fallbackServer = app.listen(0, '127.0.0.1', () => logServerAddress(fallbackServer));
});
