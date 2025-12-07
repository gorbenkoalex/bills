"use strict";
const fileInput = document.getElementById('receipt-file');
const dropZone = document.querySelector('.drop-zone');
const processButton = document.getElementById('process');
const progressBar = document.getElementById('progress');
const progressLabel = document.getElementById('progress-label');
const tableBody = document.querySelector('#items tbody');
const summaryList = document.getElementById('summary');
const rawTextArea = document.getElementById('raw-text');
const exportButton = document.getElementById('export-csv');
const previewImage = document.getElementById('preview');
let currentItems = [];
let currentFilename = '';
function isPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
function showStatus(message) {
    progressLabel.textContent = message;
}
function setProgress(value) {
    progressBar.style.width = `${value}%`;
    progressBar.setAttribute('aria-valuenow', value.toFixed(0));
}
function normalizeNumber(input) {
    if (!input)
        return 0;
    const cleaned = input.replace(/[^\d.,-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}
function parseReceipt(text) {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const itemMatches = [];
    const priceLine = /(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:x|×)?\s*(\d+(?:[.,]\d+)?)/i;
    for (const line of lines) {
        const match = priceLine.exec(line);
        if (match) {
            const description = match[1].replace(/[^\w\s.-]/g, '').trim();
            const quantity = normalizeNumber(match[2]);
            const price = normalizeNumber(match[3]);
            const total = Number((quantity * price).toFixed(2));
            if (description && quantity > 0 && price > 0) {
                itemMatches.push({ description, quantity, price, total });
            }
        }
    }
    const storeLine = lines.find((line) => /store|market|shop|magazin/i.test(line));
    const dateMatch = text.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/);
    const totalMatch = text.match(/total[^\d]*([\d.,]+)$/im);
    return {
        storeName: storeLine,
        purchaseDate: dateMatch ? dateMatch[1] : undefined,
        grandTotal: totalMatch ? normalizeNumber(totalMatch[1]) : undefined,
        items: itemMatches,
        rawText: text,
    };
}
function renderSummary(parsed) {
    summaryList.innerHTML = '';
    const addRow = (label, value) => {
        if (!value)
            return;
        const li = document.createElement('li');
        li.innerHTML = `<span class="label">${label}</span><span>${value}</span>`;
        summaryList.appendChild(li);
    };
    addRow('Магазин', parsed.storeName);
    addRow('Дата', parsed.purchaseDate);
    addRow('Загальна сума', parsed.grandTotal?.toFixed(2));
    addRow('Позицій знайдено', parsed.items.length);
}
function renderItems(items) {
    tableBody.innerHTML = '';
    for (const item of items) {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${item.description}</td>
      <td>${item.quantity}</td>
      <td>${item.price.toFixed(2)}</td>
      <td>${item.total.toFixed(2)}</td>
    `;
        tableBody.appendChild(row);
    }
    if (items.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" class="muted">Не вдалося знайти позиції. Спробуйте інше фото або відредагуйте текст вручну.</td>`;
        tableBody.appendChild(row);
    }
}
function exportToCsv(items, filename) {
    if (!items.length)
        return;
    const header = 'Найменування,Кількість,Ціна,Всього';
    const body = items
        .map((item) => `${item.description},${item.quantity},${item.price.toFixed(2)},${item.total.toFixed(2)}`)
        .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename || 'receipt'}-items.csv`;
    link.click();
}
async function recognize(file) {
    setProgress(5);
    showStatus('Завантаження зображення...');
    const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (info) => {
            const pct = Math.round((info.progress || 0) * 100);
            setProgress(pct);
            showStatus(info.status === 'recognizing text' ? 'Розпізнавання тексту...' : info.status);
        },
    });
    return data.text;
}
function showPreview(src) {
    previewImage.src = src;
    previewImage.classList.add('visible');
}
function setPreview(file) {
    currentFilename = file.name.replace(/\.[^.]+$/, '');
    const reader = new FileReader();
    reader.onload = () => showPreview(reader.result);
    reader.readAsDataURL(file);
}
async function renderPdfFirstPage(file) {
    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Canvas is not supported in this browser');
    }
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
            if (!result) {
                reject(new Error('Не вдалося перетворити PDF у зображення'));
                return;
            }
            resolve(result);
        }, 'image/png');
    });
    const dataUrl = canvas.toDataURL('image/png');
    return { blob, dataUrl };
}
async function handleFile(file) {
    if (!file)
        return;
    currentFilename = file.name.replace(/\.[^.]+$/, '');
    processButton.disabled = true;
    exportButton.disabled = true;
    setProgress(0);
    showStatus('Підготовка до розпізнавання...');
    try {
        let target = file;
        if (isPdf(file)) {
            showStatus('Рендеримо першу сторінку PDF...');
            const rendered = await renderPdfFirstPage(file);
            target = new File([rendered.blob], `${currentFilename}-page1.png`, { type: 'image/png' });
            showPreview(rendered.dataUrl);
        }
        else {
            setPreview(file);
        }
        const text = await recognize(target);
        const parsed = parseReceipt(text);
        currentItems = parsed.items;
        renderSummary(parsed);
        renderItems(parsed.items);
        rawTextArea.value = parsed.rawText.trim();
        exportButton.disabled = parsed.items.length === 0;
        showStatus('Готово');
        setProgress(100);
    }
    catch (error) {
        console.error(error);
        showStatus('Сталася помилка під час розпізнавання.');
    }
    finally {
        processButton.disabled = false;
    }
}
function wireFileInput() {
    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files && files.length) {
            handleFile(files[0]);
        }
    });
    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('active');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('active');
        const files = event.dataTransfer?.files;
        if (files && files.length) {
            handleFile(files[0]);
        }
    });
}
function init() {
    if (typeof pdfjsLib !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js';
    }
    wireFileInput();
    processButton.addEventListener('click', () => {
        if (fileInput.files && fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
        else {
            showStatus('Спочатку додайте фото чеку.');
        }
    });
    exportButton.addEventListener('click', () => exportToCsv(currentItems, currentFilename));
}
document.addEventListener('DOMContentLoaded', init);
