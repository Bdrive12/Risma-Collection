const ADMIN_SESSION_KEY = 'aura_admin_unlocked';
const ADMIN_WHATSAPP_KEY = 'aura_admin_whatsapp';
const QRIS_PAYLOAD = '00020101021126610014COM.GO-JEK.WWW01189360091432827654390210G2827654390303UMI51440014ID.CO.QRIS.WWW0215ID10243558991200303UMI5204569753033605802ID5923RISMA COLLECTION, LM KM6011TANAH DATAR61052721162070703A0163040F12';
const internDetailFieldIds = [
    'internInstitutionField', 'internSupervisorField', 'internDepartmentField',
    'internStartDateField', 'internEndDateField', 'internEvaluationPanel'
];
const defaultProducts = [
    { id: 'p1', name: 'Elysia Velvet Evening Gown', category: 'Evening Dress', desc: 'Gaun malam velvet hitam pekat beraksen sulaman benang emas.', image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80' },
    { id: 'p2', name: 'Aurelia Golden Silk Kaftan', category: 'Luxury Kaftan', desc: 'Kaftan sutra eksklusif dengan bordir tangan warna champagne gold.', image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80' },
    { id: 'p3', name: 'Seraphina Modern Couture Set', category: 'Formal Suit', desc: 'Setelan busana formal wanita modern beraksen emas antik.', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80' },
    { id: 'p4', name: 'Valeria Regal Organza Dress', category: 'Party Dress', desc: 'Gaun midi organza lapis ganda dengan kilau emas lembut.', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80' },
    { id: 'p5', name: 'Isabella Royal Brocade Dress', category: 'Exclusive Brocade', desc: 'Gaun brokat istimewa motif oriental benang metalik emas.', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80' },
    { id: 'p6', name: 'Celeste Minimalist Silk Maxi', category: 'Maxi Dress', desc: 'Maxi dress sutra satin hitam clean cut jatuh sempurna.', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80' }
];
let products = defaultProducts;
let orders = loadStoredJSON('aura_orders', []).map(order => ({
    ...order,
    totalAmount: order.totalAmount != null ? Number(order.totalAmount) : (order.productPrice != null ? Number(order.productPrice) : null),
    onsiteMeasurement: Boolean(order.onsiteMeasurement)
}));
const INTERN_STORAGE_KEY = 'aura_interns';
const BRAND_LOGO_STORAGE_KEY = 'aura_brand_logo';
const evaluationCriteria = [
    { key: 'discipline', label: 'Kedisiplinan', inputId: 'scoreDiscipline' },
    { key: 'quality', label: 'Kualitas tugas', inputId: 'scoreQuality' },
    { key: 'communication', label: 'Komunikasi', inputId: 'scoreCommunication' },
    { key: 'teamwork', label: 'Kerja sama', inputId: 'scoreTeamwork' },
    { key: 'initiative', label: 'Inisiatif', inputId: 'scoreInitiative' },
    { key: 'learning', label: 'Kemauan belajar', inputId: 'scoreLearning' }
];
let interns = loadStoredJSON(INTERN_STORAGE_KEY, []);
let currentAdminMode = false;

window.onload = async function() {
    try {
        const response = await fetch('/api/products');
        const savedProducts = await readApiResponse(response);
        if (savedProducts.length) products = savedProducts;
    } catch (error) {
        console.error(error);
        showToast('Katalog offline', error.message || 'Jalankan server aplikasi dan periksa konfigurasi Firebase.');
    }
    renderCatalog();
    renderAdminTable();
    renderCatalogAdminList();
    populateProductSelect();
    renderInterns();
    updateBrandLogo();
    document.getElementById('adminWhatsAppInput').value = localStorage.getItem(ADMIN_WHATSAPP_KEY) || '';
    document.getElementById('onsiteMeasurement').addEventListener('change', () => updateAddressRequirement('onsiteMeasurement', 'custAddress', 'custAddressLabel'));
    document.getElementById('adminOnsiteMeasurement').addEventListener('change', () => updateAddressRequirement('adminOnsiteMeasurement', 'adminCustAddress', 'adminCustAddressLabel'));
    updateAddressRequirement('onsiteMeasurement', 'custAddress', 'custAddressLabel');
    updateAddressRequirement('adminOnsiteMeasurement', 'adminCustAddress', 'adminCustAddressLabel');
};

async function readApiResponse(response) {
    const body = await response.text();
    let result;
    try {
        result = body ? JSON.parse(body) : {};
    } catch (error) {
        if (response.status === 405) {
            throw new Error('API tidak tersedia di server ini. Jalankan npm start dan buka http://localhost:3000.');
        }
        throw new Error(`Server mengirim respons yang tidak valid (HTTP ${response.status}).`);
    }
    if (!response.ok) {
        if (response.status === 405) {
            throw new Error('API tidak tersedia di server ini. Jalankan npm start dan buka http://localhost:3000.');
        }
        throw new Error(result.error || `Permintaan gagal (HTTP ${response.status}).`);
    }
    return result;
}

function renderCatalog() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    products.forEach(item => {
        const card = document.createElement('div');
        card.className = 'group bg-dark-800 border border-gray-800 rounded-2xl overflow-hidden hover:border-gold-500/50 transition duration-500 flex flex-col justify-between shadow-lg';
        card.innerHTML = `
            <div class="relative overflow-hidden aspect-[4/5] bg-dark-700">
                <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-700" onerror="this.src='https://placehold.co/600x800/f8f6f0/a77d20?text=RISMA'">
                <span class="absolute top-4 left-4 bg-dark-900/80 backdrop-blur-md text-gold-400 text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full border border-gold-500/30">${escapeHTML(item.category)}</span>
            </div>
            <div class="p-6 flex flex-col flex-grow justify-between">
                <div>
                    <h3 class="font-serif text-xl font-bold text-white group-hover:text-gold-300 transition">${escapeHTML(item.name)}</h3>
                    <p class="text-gray-400 text-xs mt-2 line-clamp-2">${escapeHTML(item.desc)}</p>
                </div>
                <div class="mt-6 pt-4 border-t border-gray-800 flex items-center justify-end">
                    <button onclick="openOrderModal('${escapeHTML(item.id)}')" class="bg-gold-400 hover:bg-gold-300 text-black text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md flex items-center space-x-1.5">
                        <span>Pesan Sekarang</span>
                        <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function populateProductSelect() {
    const select = document.getElementById('adminProductSelect');
    select.innerHTML = '';
    products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
}

function renderCatalogAdminList() {
    const list = document.getElementById('catalogAdminList');
    list.innerHTML = products.map(product => `
        <article class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <img src="${escapeHTML(product.image)}" alt="" class="w-14 h-16 object-cover rounded-lg bg-dark-700">
                <div class="min-w-0">
                    <h4 class="font-semibold text-white truncate">${escapeHTML(product.name)}</h4>
                    <p class="text-xs text-gray-400">${escapeHTML(product.category)}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button type="button" onclick="editProduct('${escapeHTML(product.id)}')" class="border border-gray-700 text-gray-600 px-3 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-pen-to-square mr-1"></i>Edit</button>
                <button type="button" onclick="deleteProduct('${escapeHTML(product.id)}')" class="border border-red-500/30 text-red-600 px-3 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-trash mr-1"></i>Hapus</button>
            </div>
        </article>
    `).join('') || '<p class="p-6 text-sm text-gray-500">Belum ada produk katalog.</p>';
}

function updateAddressRequirement(checkboxId, addressId, labelId) {
    const onsite = document.getElementById(checkboxId).checked;
    document.getElementById(addressId).required = onsite;
    document.getElementById(labelId).textContent = onsite ? 'Alamat Lengkap untuk Pengukuran *' : 'Alamat Lengkap (opsional)';
}

function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productRecordId').value = '';
    document.getElementById('productImage').required = true;
    document.getElementById('productEditorTitle').textContent = 'Tambah Produk Katalog';
    document.getElementById('productSubmitButton').textContent = 'Simpan Produk';
    document.getElementById('cancelProductEditButton').classList.add('hidden');
}

async function persistCatalog(nextProducts, imageFile, imageProductId) {
    const formData = new FormData();
    formData.append('products', JSON.stringify(nextProducts));
    if (imageFile) {
        formData.append('imageProductId', imageProductId);
        formData.append('image', imageFile);
    }
    const response = await fetch('/api/products', { method: 'PUT', body: formData });
    const result = await readApiResponse(response);
    return result.products;
}

async function saveProduct(event) {
    event.preventDefault();
    const recordId = document.getElementById('productRecordId').value;
    const imageFile = document.getElementById('productImage').files[0];
    if (!recordId && !imageFile) {
        showToast('Foto wajib dipilih', 'Pilih foto untuk produk katalog baru.');
        return;
    }
    const product = {
        id: recordId || `product-${Date.now()}`,
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value.trim(),
        desc: document.getElementById('productDescription').value.trim(),
        image: products.find(item => item.id === recordId)?.image || ''
    };
    const nextProducts = recordId
        ? products.map(item => item.id === recordId ? product : item)
        : [...products, product];
    try {
        products = await persistCatalog(nextProducts, imageFile, product.id);
        resetProductForm();
        renderCatalog();
        renderCatalogAdminList();
        populateProductSelect();
        showToast('Katalog diperbarui', `${product.name} berhasil disimpan.`);
    } catch (error) {
        showToast('Gagal menyimpan katalog', error.message);
    }
}

function editProduct(productId) {
    const product = products.find(item => item.id === productId);
    if (!product) return;
    document.getElementById('productRecordId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productDescription').value = product.desc;
    document.getElementById('productImage').required = false;
    document.getElementById('productEditorTitle').textContent = 'Edit Produk Katalog';
    document.getElementById('productSubmitButton').textContent = 'Simpan Perubahan';
    document.getElementById('cancelProductEditButton').classList.remove('hidden');
    document.getElementById('productName').focus();
}

async function deleteProduct(productId) {
    const product = products.find(item => item.id === productId);
    if (!product || !confirm(`Hapus produk ${product.name} dari katalog?`)) return;
    try {
        products = await persistCatalog(products.filter(item => item.id !== productId));
        renderCatalog();
        renderCatalogAdminList();
        populateProductSelect();
        showToast('Produk dihapus', `${product.name} tidak lagi tampil di katalog.`);
    } catch (error) {
        showToast('Gagal menghapus produk', error.message);
    }
}

function openAdminAccessModal() {
    document.getElementById('adminAccessTitle').textContent = 'Masuk Admin';
    document.getElementById('adminAccessMessage').textContent = 'Masukkan kata sandi admin yang dikonfigurasi di server.';
    document.getElementById('adminAccessSubmit').textContent = 'Masuk';
    document.getElementById('adminAccessPassword').value = '';
    document.getElementById('adminAccessError').classList.add('hidden');
    const modal = document.getElementById('adminAccessModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('adminAccessPassword').focus();
}

function closeAdminAccessModal() {
    document.getElementById('adminAccessModal').classList.remove('flex');
    document.getElementById('adminAccessModal').classList.add('hidden');
}

async function submitAdminAccess(event) {
    event.preventDefault();
    const password = document.getElementById('adminAccessPassword').value;
    const error = document.getElementById('adminAccessError');
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        await readApiResponse(response);
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        closeAdminAccessModal();
        enterAdminMode();
    } catch (accessError) {
        error.textContent = accessError.message || 'Kata sandi tidak dapat diproses di browser ini.';
        error.classList.remove('hidden');
    }
}

async function changeAdminPassword(event) {
    event.preventDefault();
    const form = document.getElementById('adminPasswordForm');
    const currentPassword = document.getElementById('currentAdminPassword').value;
    const newPassword = document.getElementById('newAdminPassword').value;
    const confirmPassword = document.getElementById('confirmAdminPassword').value;
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
        showToast('Kata sandi tidak cocok', 'Pastikan kata sandi baru minimal 8 karakter dan kedua isian sama.');
        return;
    }
    try {
        const response = await fetch('/api/admin/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        await readApiResponse(response);
        form.reset();
        showToast('Kata sandi diperbarui', 'Kata sandi admin telah diperbarui.');
    } catch (error) {
        showToast('Gagal mengubah kata sandi', error.message);
    }
}

function saveStoreSettings(event) {
    event.preventDefault();
    const phone = formatWhatsAppNumber(document.getElementById('adminWhatsAppInput').value);
    if (phone.length < 10 || phone.length > 15) {
        showToast('Nomor tidak valid', 'Masukkan nomor WhatsApp dengan kode negara atau awalan 0.');
        return;
    }
    localStorage.setItem(ADMIN_WHATSAPP_KEY, phone);
    document.getElementById('adminWhatsAppInput').value = phone;
    showToast('Nomor disimpan', 'Nomor WhatsApp admin telah diperbarui.');
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
}

function crc16CCITT(value) {
    let crc = 0xffff;
    for (let index = 0; index < value.length; index += 1) {
        crc ^= value.charCodeAt(index) << 8;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildAmountBoundQris(amount) {
    const amountValue = String(Math.round(Number(amount)));
    if (!/^\d{1,13}$/.test(amountValue) || Number(amountValue) <= 0) throw new Error('Nominal QRIS tidak valid.');

    const payload = QRIS_PAYLOAD.slice(0, -8);
    const fields = [];
    let amountInserted = false;
    for (let offset = 0; offset < payload.length;) {
        const tag = payload.slice(offset, offset + 2);
        const length = Number(payload.slice(offset + 2, offset + 4));
        const valueStart = offset + 4;
        const fieldValue = payload.slice(valueStart, valueStart + length);
        if (fieldValue.length !== length) throw new Error('Format QRIS toko tidak valid.');
        offset = valueStart + length;
        if (tag === '54') continue;
        if (tag === '58' && !amountInserted) {
            fields.push(`54${String(amountValue.length).padStart(2, '0')}${amountValue}`);
            amountInserted = true;
        }
        const nextValue = tag === '01' ? '12' : fieldValue;
        fields.push(`${tag}${String(nextValue.length).padStart(2, '0')}${nextValue}`);
    }
    if (!amountInserted) throw new Error('QRIS toko tidak memiliki posisi nominal.');
    const payloadWithCrc = `${fields.join('')}6304`;
    return `${payloadWithCrc}${crc16CCITT(payloadWithCrc)}`;
}

function loadStoredJSON(key, fallback) {
    try {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : fallback;
    } catch (error) {
        return fallback;
    }
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function switchAdminTab(tab) {
    const panels = { orders: 'ordersManagementPanel', catalog: 'catalogManagementPanel', settings: 'settingsManagementPanel', hr: 'hrManagementPanel' };
    const tabs = { orders: 'adminOrdersTab', catalog: 'adminCatalogTab', settings: 'adminSettingsTab', hr: 'adminHrTab' };
    Object.entries(panels).forEach(([key, panelId]) => document.getElementById(panelId).classList.toggle('hidden', key !== tab));
    Object.entries(tabs).forEach(([key, tabId]) => {
        document.getElementById(tabId).className = key === tab
            ? 'bg-gold-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition'
            : 'bg-dark-700 text-gray-300 text-sm font-semibold px-4 py-2 rounded-lg border border-gray-700 transition';
    });
    if (tab === 'hr') renderInterns();
    if (tab === 'catalog') renderCatalogAdminList();
    if (tab === 'settings') document.getElementById('adminWhatsAppInput').value = localStorage.getItem(ADMIN_WHATSAPP_KEY) || '';
}

function toggleInternDetails() {
    const showInternDetails = document.getElementById('internIsIntern').checked;
    internDetailFieldIds.forEach(id => document.getElementById(id).classList.toggle('hidden', !showInternDetails));
}

function getInternScoresFromForm() {
    return Object.fromEntries(evaluationCriteria.map(criterion => [
        criterion.key,
        Number(document.getElementById(criterion.inputId).value)
    ]));
}

function getInternScore(intern) {
    const scores = evaluationCriteria.map(criterion => Number(intern.scores?.[criterion.key]) || 0);
    return scores.reduce((total, score) => total + score, 0) / scores.length;
}

function getScoreLabel(score) {
    if (score >= 4.5) return 'Unggul';
    if (score >= 3.5) return 'Sangat baik';
    if (score >= 2.5) return 'Baik';
    if (score >= 1.5) return 'Cukup';
    return 'Perlu bimbingan';
}

function formatInternDate(value) {
    if (!value) return 'Belum ditentukan';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(`${value}T00:00:00`));
}

function renderInterns() {
    const list = document.getElementById('internList');
    const emptyState = document.getElementById('internEmptyState');
    const countBadge = document.getElementById('internCountBadge');
    if (!list || !emptyState || !countBadge) return;

    countBadge.textContent = `${interns.length} Data`;
    emptyState.classList.toggle('hidden', interns.length > 0);
    list.innerHTML = interns.map(intern => {
        const isIntern = intern.isIntern !== false;
        const average = isIntern ? getInternScore(intern) : 0;
        const details = isIntern ? evaluationCriteria.map(criterion =>
            `<span class="text-[10px] text-gray-400">${criterion.label}: <strong class="text-gray-200">${Number(intern.scores?.[criterion.key]) || 0}/5</strong></span>`
        ).join('') : '';
        const recordNumber = isIntern ? intern.internNo : intern.employeeNo;
        return `
            <article class="p-5 sm:p-6">
                <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <h4 class="font-semibold text-white">${escapeHTML(intern.name)}</h4>
                            <span class="font-mono text-[10px] text-gold-300 border border-gold-500/30 px-2 py-0.5 rounded">${escapeHTML(recordNumber || '-')}</span>
                            <span class="text-[10px] border border-gray-700 px-2 py-0.5 rounded">${isIntern ? 'Intern' : 'Pegawai'}</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-1 mt-3 text-xs text-gray-400">
                            <span><i class="fa-solid fa-phone w-4 text-gold-400"></i>${escapeHTML(intern.phone)}</span>
                            <span><i class="fa-solid fa-envelope w-4 text-gold-400"></i>${escapeHTML(intern.email || 'Email belum diisi')}</span>
                            ${isIntern ? `<span><i class="fa-solid fa-building w-4 text-gold-400"></i>${escapeHTML(intern.institution || 'Institusi belum diisi')}</span>` : ''}
                            <span><i class="fa-solid fa-location-dot w-4 text-gold-400"></i>${escapeHTML(intern.address)}</span>
                            ${intern.department ? `<span><i class="fa-solid fa-briefcase w-4 text-gold-400"></i>${escapeHTML(intern.department)}</span>` : ''}
                            ${isIntern && intern.supervisor ? `<span><i class="fa-solid fa-user-tie w-4 text-gold-400"></i>${escapeHTML(intern.supervisor)}</span>` : ''}
                            ${isIntern ? `<span class="sm:col-span-2 xl:col-span-3"><i class="fa-regular fa-calendar w-4 text-gold-400"></i>${formatInternDate(intern.startDate)} - ${formatInternDate(intern.endDate)}</span>` : ''}
                        </div>
                        ${isIntern ? `<div class="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-gray-800">${details}</div>` : ''}
                    </div>
                    <div class="lg:w-40 shrink-0">
                        ${isIntern ? `
                        <div class="flex items-baseline justify-between text-xs mb-1.5">
                            <span class="text-gray-400">Penilaian</span>
                            <strong class="text-gold-300">${average.toFixed(1)} / 5</strong>
                        </div>
                        <div class="h-2 bg-dark-900 rounded-full overflow-hidden" role="meter" aria-label="Nilai rata-rata" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${average.toFixed(1)}">
                            <div class="h-full bg-gold-400 rounded-full" style="width:${Math.max(0, Math.min(100, average * 20))}%"></div>
                        </div>
                        <p class="text-[11px] text-gold-300 mt-1">${getScoreLabel(average)}</p>
                        ` : '<p class="text-xs text-gray-400">Data pegawai</p>'}
                        <div class="flex gap-2 mt-3">
                            <button type="button" onclick="editIntern('${escapeHTML(intern.id)}')" aria-label="Edit ${escapeHTML(intern.name)}" class="border border-gray-700 hover:border-gold-400 text-gray-300 hover:text-gold-300 px-3 py-1.5 rounded-lg text-xs transition"><i class="fa-solid fa-pen-to-square mr-1"></i>Edit</button>
                            <button type="button" onclick="deleteIntern('${escapeHTML(intern.id)}')" aria-label="Hapus ${escapeHTML(intern.name)}" class="border border-gray-700 hover:border-red-400 text-gray-300 hover:text-red-300 px-3 py-1.5 rounded-lg text-xs transition"><i class="fa-solid fa-trash mr-1"></i>Hapus</button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function saveIntern(event) {
    event.preventDefault();
    const isIntern = document.getElementById('internIsIntern').checked;
    const startDate = isIntern ? document.getElementById('internStartDate').value : '';
    const endDate = isIntern ? document.getElementById('internEndDate').value : '';
    if (isIntern && startDate && endDate && endDate < startDate) {
        showToast('Tanggal tidak valid', 'Tanggal selesai harus sama atau setelah tanggal mulai.');
        return;
    }

    const recordId = document.getElementById('internRecordId').value;
    const existingIntern = interns.find(intern => intern.id === recordId);
    const recordNumber = `${isIntern ? 'INT' : 'PGW'}-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const intern = {
        id: recordId || `intern-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        isIntern,
        internNo: isIntern ? (existingIntern?.internNo || recordNumber) : '',
        employeeNo: isIntern ? (existingIntern?.employeeNo || '') : (existingIntern?.employeeNo || recordNumber),
        name: document.getElementById('internName').value.trim(),
        phone: document.getElementById('internPhone').value.trim(),
        email: document.getElementById('internEmail').value.trim(),
        institution: isIntern ? document.getElementById('internInstitution').value.trim() : '',
        address: document.getElementById('internAddress').value.trim(),
        supervisor: isIntern ? document.getElementById('internSupervisor').value.trim() : '',
        department: document.getElementById('internDepartment').value.trim(),
        startDate,
        endDate,
        scores: isIntern ? getInternScoresFromForm() : null
    };

    if (existingIntern) {
        interns = interns.map(item => item.id === recordId ? intern : item);
    } else {
        interns.unshift(intern);
    }

    try {
        localStorage.setItem(INTERN_STORAGE_KEY, JSON.stringify(interns));
        resetInternForm();
        renderInterns();
        showToast(existingIntern ? 'Data diperbarui' : 'Intern ditambahkan', `${intern.name} berhasil disimpan.`);
    } catch (error) {
        showToast('Gagal menyimpan', 'Penyimpanan browser tidak tersedia atau sudah penuh.');
    }
}

function editIntern(recordId) {
    const intern = interns.find(item => item.id === recordId);
    if (!intern) return;
    document.getElementById('internRecordId').value = intern.id;
    document.getElementById('internIsIntern').checked = intern.isIntern !== false;
    toggleInternDetails();
    document.getElementById('internName').value = intern.name || '';
    document.getElementById('internPhone').value = intern.phone || '';
    document.getElementById('internEmail').value = intern.email || '';
    document.getElementById('internInstitution').value = intern.institution || '';
    document.getElementById('internAddress').value = intern.address || '';
    document.getElementById('internSupervisor').value = intern.supervisor || '';
    document.getElementById('internDepartment').value = intern.department || '';
    document.getElementById('internStartDate').value = intern.startDate || '';
    document.getElementById('internEndDate').value = intern.endDate || '';
    evaluationCriteria.forEach(criterion => {
        document.getElementById(criterion.inputId).value = intern.scores?.[criterion.key] || 3;
    });
    document.getElementById('internSubmitButton').innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Simpan Perubahan';
    document.getElementById('cancelInternEditButton').classList.remove('hidden');
    document.getElementById('internName').focus();
}

function resetInternForm() {
    document.getElementById('internForm').reset();
    document.getElementById('internRecordId').value = '';
    toggleInternDetails();
    document.getElementById('internSubmitButton').innerHTML = '<i class="fa-solid fa-user-plus mr-2"></i>Simpan Data Intern';
    document.getElementById('cancelInternEditButton').classList.add('hidden');
}

function deleteIntern(recordId) {
    const intern = interns.find(item => item.id === recordId);
    if (!intern || !confirm(`Hapus data intern ${intern.name}?`)) return;
    interns = interns.filter(item => item.id !== recordId);
    localStorage.setItem(INTERN_STORAGE_KEY, JSON.stringify(interns));
    renderInterns();
    showToast('Data dihapus', `${intern.name} telah dihapus dari daftar.`);
}

function updateBrandLogo() {
    const logo = localStorage.getItem(BRAND_LOGO_STORAGE_KEY);
    ['brandLogo', 'logoPreview'].forEach(id => {
        const image = document.getElementById(id);
        const fallback = document.getElementById(id === 'brandLogo' ? 'brandLogoFallback' : 'logoPreviewFallback');
        image.classList.toggle('hidden', !logo);
        fallback.classList.toggle('hidden', Boolean(logo));
        if (logo) image.src = logo;
        else image.removeAttribute('src');
    });
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    const message = document.getElementById('logoMessage');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        message.textContent = 'Pilih file gambar yang valid.';
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const image = new Image();
        image.onload = () => {
            const scale = Math.min(1, 512 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            try {
                localStorage.setItem(BRAND_LOGO_STORAGE_KEY, canvas.toDataURL('image/jpeg', 0.84));
                updateBrandLogo();
                message.textContent = 'Logo tersimpan di browser ini.';
            } catch (error) {
                message.textContent = 'Gagal menyimpan. Coba gambar yang lebih kecil.';
            }
            event.target.value = '';
        };
        image.onerror = () => { message.textContent = 'Gambar tidak dapat dibuka.'; };
        image.src = reader.result;
    };
    reader.onerror = () => { message.textContent = 'Gagal membaca file gambar.'; };
    reader.readAsDataURL(file);
}

function removeBrandLogo() {
    localStorage.removeItem(BRAND_LOGO_STORAGE_KEY);
    document.getElementById('logoMessage').textContent = 'Logo bawaan digunakan kembali.';
    updateBrandLogo();
}

function toggleAdminMode() {
    if (currentAdminMode) {
        currentAdminMode = false;
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        fetch('/api/admin/logout', { method: 'POST' });
        document.getElementById('adminView').classList.add('hidden');
        document.getElementById('catalogView').classList.remove('hidden');
        document.getElementById('adminToggleText').innerText = 'Mode Admin';
        const adminToggleButton = document.getElementById('adminToggleBtn');
        adminToggleButton.setAttribute('aria-label', 'Mode Admin');
        adminToggleButton.title = 'Mode Admin';
        adminToggleButton.classList.remove('bg-gold-400', 'text-black');
        adminToggleButton.classList.add('bg-dark-700', 'text-gold-400');
        return;
    }
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true') enterAdminMode();
    else openAdminAccessModal();
}

function enterAdminMode() {
    currentAdminMode = true;
    const catalogView = document.getElementById('catalogView');
    const adminView = document.getElementById('adminView');
    const adminToggleText = document.getElementById('adminToggleText');
    const adminToggleBtn = document.getElementById('adminToggleBtn');
    catalogView.classList.add('hidden');
    adminView.classList.remove('hidden');
    adminToggleText.innerText = 'Mode Katalog';
    adminToggleBtn.setAttribute('aria-label', 'Mode Katalog');
    adminToggleBtn.title = 'Mode Katalog';
    adminToggleBtn.classList.add('bg-gold-400', 'text-black');
    adminToggleBtn.classList.remove('bg-dark-700', 'text-gold-400');
    renderAdminTable();
}

function switchView() { if (currentAdminMode) toggleAdminMode(); }

function openOrderModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    document.getElementById('inputProductId').value = product.id;
    document.getElementById('modalProductName').innerText = product.name;
    document.getElementById('orderForm').reset();
    document.getElementById('inputProductId').value = product.id;
    updateAddressRequirement('onsiteMeasurement', 'custAddress', 'custAddressLabel');

    const modal = document.getElementById('orderModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
function closeOrderModal() { document.getElementById('orderModal').classList.remove('flex'); document.getElementById('orderModal').classList.add('hidden'); }

function handleOrderSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById('inputProductId').value;
    const product = products.find(p => p.id === productId);
    const orderNo = 'AC-' + Math.floor(10000 + Math.random() * 90000);

    const newOrder = {
        orderNo,
        productId,
        productName: product.name,
        totalAmount: null,
        custName: document.getElementById('custName').value,
        custPhone: document.getElementById('custPhone').value,
        custAddress: document.getElementById('custAddress').value || '-',
        onsiteMeasurement: document.getElementById('onsiteMeasurement').checked,
        sizeChest: document.getElementById('sizeChest').value || '-',
        sizeWaist: document.getElementById('sizeWaist').value || '-',
        sizeHeight: document.getElementById('sizeHeight').value || '-',
        custSchedule: document.getElementById('custSchedule').value || 'Jadwal Menyesuaikan',
        paymentStatus: 'Belum Dibayar',
        orderStatus: 'Sedang Diproses',
        proofImage: null,
        createdAt: new Date().toISOString().slice(0, 10)
    };

    orders.unshift(newOrder);
    localStorage.setItem('aura_orders', JSON.stringify(orders));
    closeOrderModal();
    renderAdminTable();
    showToast('Pesanan Berhasil!', `No. Pesanan: ${orderNo}. Admin akan mengirimkan nominal setelah konsultasi.`);
                
    setTimeout(() => {
        openStatusModal();
        document.getElementById('searchOrderNoInput').value = orderNo;
        searchOrderStatus();
    }, 500);
}

function openAdminAddModal() {
    document.getElementById('adminAddForm').reset();
    updateAddressRequirement('adminOnsiteMeasurement', 'adminCustAddress', 'adminCustAddressLabel');
    const modal = document.getElementById('adminAddModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
function closeAdminAddModal() { document.getElementById('adminAddModal').classList.remove('flex'); document.getElementById('adminAddModal').classList.add('hidden'); }

function handleAdminAddSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById('adminProductSelect').value;
    const product = products.find(p => p.id === productId);
    const orderNo = 'AC-' + Math.floor(10000 + Math.random() * 90000);

    const newOrder = {
        orderNo,
        productId,
        productName: product.name,
        totalAmount: null,
        custName: document.getElementById('adminCustName').value,
        custPhone: document.getElementById('adminCustPhone').value,
        custAddress: document.getElementById('adminCustAddress').value || '-',
        onsiteMeasurement: document.getElementById('adminOnsiteMeasurement').checked,
        sizeChest: document.getElementById('adminSizeChest').value || '-',
        sizeWaist: document.getElementById('adminSizeWaist').value || '-',
        sizeHeight: document.getElementById('adminSizeHeight').value || '-',
        custSchedule: 'Dijadwalkan Admin',
        paymentStatus: 'Belum Dibayar',
        orderStatus: document.getElementById('adminInitialStatus').value,
        proofImage: null,
        createdAt: new Date().toISOString().slice(0, 10)
    };

    orders.unshift(newOrder);
    localStorage.setItem('aura_orders', JSON.stringify(orders));
    closeAdminAddModal();
    renderAdminTable();
    showToast('Entri Berhasil', `Pesanan baru #${orderNo} berhasil ditambahkan oleh admin.`);
}

function openStatusModal() {
    const modal = document.getElementById('statusModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('searchOrderNoInput').value = '';
    document.getElementById('statusResultContainer').classList.add('hidden');
    document.getElementById('statusNotFound').classList.add('hidden');
}
function closeStatusModal() { document.getElementById('statusModal').classList.remove('flex'); document.getElementById('statusModal').classList.add('hidden'); }

function searchOrderStatus() {
    const query = document.getElementById('searchOrderNoInput').value.trim().toUpperCase();
    const resultContainer = document.getElementById('statusResultContainer');
    const notFound = document.getElementById('statusNotFound');
    if (!query) return;

    const order = orders.find(o => o.orderNo.toUpperCase() === query);
    if (!order) {
        resultContainer.classList.add('hidden');
        notFound.classList.remove('hidden');
        return;
    }

    notFound.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    resultContainer.innerHTML = `
        <div class="bg-dark-900 border border-gray-700 rounded-xl p-5 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-800">
                <div>
                    <span class="text-[10px] text-gray-400 block uppercase">No. Pesanan</span>
                    <span class="font-mono text-gold-400 font-bold text-base">${order.orderNo}</span>
                </div>
                <span class="text-xs px-3 py-1 rounded-full border bg-gold-500/10 text-gold-300 border-gold-500/30 font-medium">
                    Progress: ${order.orderStatus}
                </span>
            </div>

            <div class="space-y-2">
                <span class="text-[11px] text-gray-400 font-medium block uppercase tracking-wider">Tahapan Pengerjaan Busana:</span>
                <div class="grid grid-cols-3 gap-1 text-center text-[10px]">
                    <div class="p-2 rounded border ${order.orderStatus === 'Sedang Diproses' || order.orderStatus === 'Sedang Perancangan' || order.orderStatus === 'Selesai' ? 'bg-gold-500/20 border-gold-400 text-gold-300 font-bold' : 'bg-dark-800 border-gray-700 text-gray-500'}">Pengukuran</div>
                    <div class="p-2 rounded border ${order.orderStatus === 'Sedang Perancangan' || order.orderStatus === 'Selesai' ? 'bg-gold-500/20 border-gold-400 text-gold-300 font-bold' : 'bg-dark-800 border-gray-700 text-gray-500'}">Perancangan & Jahit</div>
                    <div class="p-2 rounded border ${order.orderStatus === 'Selesai' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold' : 'bg-dark-800 border-gray-700 text-gray-500'}">Selesai</div>
                </div>
            </div>

            <div class="text-xs space-y-1.5 pt-2 border-t border-gray-800">
                <div class="flex justify-between"><span class="text-gray-400">Produk:</span> <span class="text-white font-medium">${escapeHTML(order.productName)}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Total Tagihan:</span> <span class="text-gold-600 font-semibold">${Number(order.totalAmount) > 0 ? formatRupiah(order.totalAmount) : 'Menunggu penawaran admin'}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Pemesan:</span> <span class="text-white">${escapeHTML(order.custName)}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Pengukuran di tempat:</span> <span class="text-white">${order.onsiteMeasurement ? 'Ya' : 'Tidak'}</span></div>
                ${order.onsiteMeasurement ? `<div class="flex justify-between"><span class="text-gray-400">Alamat Ukur:</span> <span class="text-white text-right max-w-[200px] truncate">${escapeHTML(order.custAddress)}</span></div>` : ''}
            </div>

            <div class="pt-3 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div class="text-xs">
                    <span class="text-gray-400 block">Status Pembayaran:</span>
                    <span class="font-semibold ${order.paymentStatus === 'Lunas' ? 'text-emerald-400' : (order.paymentStatus === 'Menunggu Verifikasi' ? 'text-purple-400' : 'text-red-400')}">
                        ${order.paymentStatus}
                    </span>
                </div>
                ${order.paymentStatus === 'Belum Dibayar' && Number(order.totalAmount) > 0 ? `
                    <button onclick="openPaymentModal('${order.orderNo}')" class="w-full sm:w-auto bg-gold-400 hover:bg-gold-300 text-black text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-md">
                        Bayar Sekarang (QRIS)
                    </button>
                ` : (order.paymentStatus === 'Belum Dibayar' ? `
                    <span class="text-[11px] text-amber-700 italic">Admin akan mengirimkan nominal setelah konsultasi</span>
                ` : (order.paymentStatus === 'Menunggu Verifikasi' ? `
                    <span class="text-[11px] text-purple-300 italic">Bukti gambar sedang diverifikasi admin</span>
                ` : `
                    <span class="text-[11px] text-emerald-400 font-medium"><i class="fa-solid fa-circle-check"></i> Lunas & Terverifikasi</span>
                `))}
            </div>
        </div>
    `;
}

function openPaymentModal(orderNo) {
    const order = orders.find(o => o.orderNo === orderNo);
    if (!order) return;
    if (!(Number(order.totalAmount) > 0)) {
        showToast('Tagihan belum tersedia', 'Admin akan mengirimkan nominal pembayaran setelah konsultasi.');
        return;
    }
    document.getElementById('payModalOrderNo').innerText = `Order #${order.orderNo}`;
    document.getElementById('payModalAmount').innerText = formatRupiah(order.totalAmount);
    document.getElementById('uploadProofForm').reset();
    document.getElementById('uploadOrderNo').value = order.orderNo;
    const adminPhone = localStorage.getItem(ADMIN_WHATSAPP_KEY);
    const adminLink = document.getElementById('adminWhatsAppLink');
    if (adminPhone) {
        adminLink.href = `https://wa.me/${formatWhatsAppNumber(adminPhone)}?text=${encodeURIComponent(`Halo Risma Collection, saya ingin konfirmasi pembayaran pesanan ${order.orderNo}.` )}`;
        adminLink.classList.remove('hidden');
    } else {
        adminLink.classList.add('hidden');
    }
    const qrContainer = document.getElementById('qrCode');
    qrContainer.innerHTML = '';
    if (typeof QRCode === 'undefined') {
        qrContainer.textContent = 'QRIS tidak dapat dimuat. Periksa koneksi internet.';
    } else {
        try {
            new QRCode(qrContainer, { text: buildAmountBoundQris(order.totalAmount), width: 192, height: 192, correctLevel: QRCode.CorrectLevel.M });
        } catch (error) {
            qrContainer.textContent = error.message;
        }
    }
    const modal = document.getElementById('paymentModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
function closePaymentModal() { document.getElementById('paymentModal').classList.remove('flex'); document.getElementById('paymentModal').classList.add('hidden'); }

function handleUploadProof(e) {
    e.preventDefault();
    const orderNo = document.getElementById('uploadOrderNo').value;
    const fileInput = document.getElementById('proofFile');
    if (fileInput.files.length === 0) return;

    const order = orders.find(o => o.orderNo === orderNo);
    if (order) {
        order.paymentStatus = 'Menunggu Verifikasi';
        order.proofImage = fileInput.files[0].name;
        localStorage.setItem('aura_orders', JSON.stringify(orders));
    }
    closePaymentModal();
    closeStatusModal();
    renderAdminTable();
    showToast('Bukti Diunggah!', 'Gambar bukti transfer berhasil dikirim. Menunggu verifikasi admin.');
}

function renderAdminTable() {
    const tbody = document.getElementById('adminOrderTableBody');
    const emptyState = document.getElementById('adminEmptyState');
    const badge = document.getElementById('totalOrderBadge');
    tbody.innerHTML = '';
    badge.innerText = `Total: ${orders.length}`;

    if (orders.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    orders.forEach(order => {
        let payBadge = order.paymentStatus === 'Lunas' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : (order.paymentStatus === 'Menunggu Verifikasi' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30');

        const row = document.createElement('tr');
        row.className = 'hover:bg-dark-700/40 transition border-b border-gray-800';
        row.innerHTML = `
            <td class="py-4 px-6 font-mono font-semibold text-gold-600">${escapeHTML(order.orderNo)}</td>
            <td class="py-4 px-6">
                <span class="font-bold text-white block">${escapeHTML(order.custName)}</span>
                <span class="text-xs text-gray-400">${escapeHTML(order.custPhone)}</span>
            </td>
            <td class="py-4 px-6">
                <span class="text-white block">${escapeHTML(order.productName)}</span>
                <span class="text-gold-600 text-xs">${Number(order.totalAmount) > 0 ? formatRupiah(order.totalAmount) : 'Tagihan belum ditentukan'}</span>
            </td>
            <td class="py-4 px-6 text-xs text-gray-300">
                <p class="max-w-[180px] truncate"><i class="fa-solid fa-location-dot text-gold-400 mr-1"></i>${order.onsiteMeasurement ? escapeHTML(order.custAddress) : 'Tidak perlu pengukuran di tempat'}</p>
                <p class="mt-1 font-mono text-[11px] text-gold-300">D:${order.sizeChest} P:${order.sizeWaist} T:${order.sizeHeight} cm</p>
            </td>
            <td class="py-4 px-6">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs border ${payBadge} font-medium">${order.paymentStatus}</span>
                ${order.paymentStatus === 'Menunggu Verifikasi' ? `
                    <button onclick="adminVerifyPayment('${order.orderNo}')" class="mt-2 block text-[11px] bg-gold-400 text-black font-semibold px-2 py-1 rounded hover:bg-gold-300 transition">Verifikasi Lunas</button>
                ` : ''}
            </td>
            <td class="py-4 px-6">
                <select onchange="adminUpdateStatus('${order.orderNo}', this.value)" class="bg-dark-900 border border-gray-700 rounded-lg text-xs px-2.5 py-1.5 text-white focus:outline-none focus:border-gold-400">
                    <option value="Sedang Diproses" ${order.orderStatus === 'Sedang Diproses' ? 'selected' : ''}>Sedang Diproses</option>
                    <option value="Sedang Perancangan" ${order.orderStatus === 'Sedang Perancangan' ? 'selected' : ''}>Sedang Perancangan</option>
                    <option value="Selesai" ${order.orderStatus === 'Selesai' ? 'selected' : ''}>Selesai</option>
                </select>
            </td>
            <td class="py-4 px-6 text-center">
                <div class="min-w-40 space-y-2">
                    ${order.paymentStatus === 'Belum Dibayar' ? `
                        <input id="invoice-${escapeHTML(order.orderNo)}" type="number" min="1" step="1000" value="${Number(order.totalAmount) > 0 ? Number(order.totalAmount) : ''}" placeholder="Nominal tagihan (Rp)" aria-label="Nominal tagihan untuk ${escapeHTML(order.orderNo)}" class="w-full bg-dark-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white">
                        <div class="flex gap-1">
                            <button type="button" onclick="sendInvoiceWhatsApp('${escapeHTML(order.orderNo)}')" class="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold px-2 py-1.5 rounded-lg"><i class="fa-brands fa-whatsapp mr-1"></i>Tagih</button>
                            ${Number(order.totalAmount) > 0 ? `<button type="button" onclick="openPaymentModal('${escapeHTML(order.orderNo)}')" class="flex-1 border border-gold-500/40 text-gold-700 text-[11px] font-semibold px-2 py-1.5 rounded-lg">QRIS</button>` : ''}
                        </div>
                    ` : (order.paymentStatus === 'Menunggu Verifikasi' ? '<span class="text-[11px] text-amber-700">Menunggu verifikasi bukti</span>' : '<span class="text-[11px] text-emerald-700">Pembayaran lunas</span>')}
                    ${order.orderStatus === 'Selesai' ? `
                        <a href="https://wa.me/${formatWhatsAppNumber(order.custPhone)}?text=${encodeURIComponent(`Halo ${order.custName}, pesanan ${order.orderNo} (${order.productName}) sudah selesai. Terima kasih!`)}" target="_blank" rel="noopener" class="inline-flex items-center justify-center space-x-1 w-full border border-emerald-700/30 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg"><i class="fa-brands fa-whatsapp"></i><span>Info Selesai</span></a>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function sendInvoiceWhatsApp(orderNo) {
    const order = orders.find(item => item.orderNo === orderNo);
    const amountInput = document.getElementById(`invoice-${orderNo}`);
    if (!order || !amountInput) return;
    const amount = Number(amountInput.value);
    if (!Number.isFinite(amount) || amount <= 0) {
        showToast('Nominal belum valid', 'Isi nominal tagihan lebih besar dari nol terlebih dahulu.');
        amountInput.focus();
        return;
    }
    order.totalAmount = amount;
    localStorage.setItem('aura_orders', JSON.stringify(orders));
    renderAdminTable();
    const storefrontUrl = ['http:', 'https:'].includes(window.location.protocol) ? `Buka ${window.location.href.split('#')[0]}, ` : '';
    const message = `Halo ${order.custName}, tagihan untuk pesanan ${order.orderNo} (${order.productName}) sebesar ${formatRupiah(amount)}. ${storefrontUrl}pilih menu Lacak Pesanan, masukkan nomor ${order.orderNo}, lalu pilih Bayar Sekarang (QRIS).`;
    window.open(`https://wa.me/${formatWhatsAppNumber(order.custPhone)}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    showToast('Tagihan disimpan', `Nominal untuk pesanan ${orderNo} siap dikirim ke WhatsApp pelanggan.`);
}

function adminVerifyPayment(orderNo) {
    const order = orders.find(o => o.orderNo === orderNo);
    if (order) {
        order.paymentStatus = 'Lunas';
        localStorage.setItem('aura_orders', JSON.stringify(orders));
        renderAdminTable();
        showToast('Pembayaran Lunas', `Pesanan #${orderNo} telah diverifikasi lunas.`);
    }
}

function adminUpdateStatus(orderNo, newStatus) {
    const order = orders.find(o => o.orderNo === orderNo);
    if (order) {
        order.orderStatus = newStatus;
        localStorage.setItem('aura_orders', JSON.stringify(orders));
        renderAdminTable();
        showToast('Status Diperbarui', `Progress pesanan #${orderNo} diubah ke: ${newStatus}`);
    }
}

function formatWhatsAppNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
    return cleaned;
}

function resetData() {
    localStorage.removeItem('aura_orders');
    orders = [];
    renderAdminTable();
    showToast('Direset', 'Semua data telah dibersihkan.');
}

function showToast(title, message) {
    const toast = document.getElementById('toastNotification');
    document.getElementById('toastTitle').innerText = title;
    document.getElementById('toastMessage').innerText = message;
    toast.classList.remove('translate-y-32', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-32', 'opacity-0');
    }, 4000);
}
