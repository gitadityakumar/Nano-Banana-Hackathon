/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- DOM ELEMENT REFERENCES ---
const webcamFeed = document.getElementById('webcam-feed') as HTMLVideoElement;
const photoCanvas = document.getElementById('photo-canvas') as HTMLCanvasElement;
const snapButton = document.getElementById('snap-button') as HTMLButtonElement;
const uploadButton = document.getElementById('upload-button') as HTMLButtonElement;
const uploadInput = document.getElementById('upload-input') as HTMLInputElement;
const genderRadios = document.querySelectorAll<HTMLInputElement>('input[name="gender"]');
const hairstyleThumbnailContainer = document.getElementById('hairstyle-thumbnails') as HTMLDivElement;
const hairEffectsSelect = document.getElementById('hair-effects-select') as HTMLSelectElement;
const facialHairFieldset = document.getElementById('facial-hair-fieldset') as HTMLFieldSetElement;
const facialHairSelect = document.getElementById('facial-hair-select') as HTMLSelectElement;
const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
const lengthSlider = document.getElementById('length-slider') as HTMLInputElement;
const lengthValue = document.getElementById('length-value') as HTMLSpanElement;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
const volumeValue = document.getElementById('volume-value') as HTMLSpanElement;
const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
const resultsGallery = document.getElementById('results-gallery')!;
const resultsPlaceholder = document.getElementById('results-placeholder')!;
const loadingIndicator = document.getElementById('loading-indicator')!;
const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
const canvasContext = photoCanvas.getContext('2d')!;

// Modal elements
const modal = document.getElementById('fullscreen-modal') as HTMLDivElement;
const modalImage = document.getElementById('fullscreen-image') as HTMLImageElement;
const closeModalBtn = document.getElementById('modal-close-btn') as HTMLButtonElement;
const zoomInBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
const zoomOutBtn = document.getElementById('zoom-out-btn') as HTMLButtonElement;


// --- DATA & STATE ---
const HAIRSTYLES = {
    female: [
        { name: 'Long & Wavy', emoji: '🌊' }, { name: 'Short Bob', emoji: '💇‍♀️' }, { name: 'Pixie Cut', emoji: '✨' },
        { name: 'Braided Crown', emoji: '👑' }, { name: 'Ponytail', emoji: '👱‍♀️' }, { name: 'Curly Afro', emoji: '👩‍🦱' },
        { name: 'Top Knot Bun', emoji: '🎀' }, { name: 'Shag Cut', emoji: '🎸' }, { name: 'Asymmetrical Bob', emoji: '📐' },
        { name: 'Curtain Bangs', emoji: '🖼️' }, { name: 'Space Buns', emoji: '👽' }, { name: 'Dutch Braids', emoji: '➿' }
    ],
    male: [
        { name: 'Short & Spiky', emoji: '💥' }, { name: 'Side Part', emoji: '🤵‍♂️' }, { name: 'Man Bun', emoji: '👱‍♂️' },
        { name: 'High Fade', emoji: '💈' }, { name: 'Slicked Back', emoji: '💼' }, { name: 'Buzz Cut', emoji: '🪖' },
        { name: 'Crew Cut', emoji: '✈️' }, { name: 'Pompadour', emoji: '🕺' }, { name: 'Undercut', emoji: '⚡' },
        { name: 'Quiff', emoji: '😎' }, { name: 'Modern Mullet', emoji: '🤘' }
    ],
};

const HAIR_EFFECTS = ['Solid Color', 'Subtle Highlights', 'Bold Highlights', 'Ombre / Dip Dye'];
const FACIAL_HAIR = ['Clean Shaven', 'Light Stubble', 'Heavy Stubble', 'Short Beard', 'Full Beard', 'Goatee', 'Circle Beard', 'Van Dyke', 'Mustache'];

let currentStream: MediaStream | null = null;
let base64ImageData: string | null = null;
let selectedGender: 'male' | 'female' = 'female';
let selectedColor: string = '#6a4028';
let selectedStyle: string = HAIRSTYLES.female[0].name;
let selectedHairEffect: string = HAIR_EFFECTS[0];
let selectedFacialHair: string = FACIAL_HAIR[0];
let selectedLength: string = 'Medium';
let selectedVolume: string = 'Medium';
let currentZoom = 1;


// --- INITIALIZATION ---
async function initialize() {
    setupEventListeners();
    initializeTheme();
    populateHairEffects();
    populateFacialHair();
    updateStyleOptionsForGender();
    await startWebcam();
}

// --- WEBCAM & PHOTO CAPTURE ---
async function startWebcam() {
    try {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamFeed.srcObject = currentStream;
        photoCanvas.style.display = 'none';
        webcamFeed.style.display = 'block';
    } catch (err) {
        console.error("Error accessing webcam:", err);
        resultsPlaceholder.textContent = `Could not access webcam. Please allow camera permissions and refresh the page.`;
    }
}

function snapPhoto() {
    photoCanvas.width = webcamFeed.videoWidth;
    photoCanvas.height = webcamFeed.videoHeight;
    canvasContext.translate(photoCanvas.width, 0);
    canvasContext.scale(-1, 1);
    canvasContext.drawImage(webcamFeed, 0, 0, photoCanvas.width, photoCanvas.height);
    canvasContext.setTransform(1, 0, 0, 1, 0, 0);
    photoCanvas.style.display = 'block';
    webcamFeed.style.display = 'none';
    base64ImageData = photoCanvas.toDataURL('image/jpeg');
    generateButton.disabled = false;
}

function handleFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                photoCanvas.width = img.width;
                photoCanvas.height = img.height;
                canvasContext.drawImage(img, 0, 0);
                photoCanvas.style.display = 'block';
                webcamFeed.style.display = 'none';
                base64ImageData = photoCanvas.toDataURL('image/jpeg');
                generateButton.disabled = false;
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
}


// --- UI UPDATES ---
function populateHairEffects() {
    hairEffectsSelect.innerHTML = HAIR_EFFECTS.map(effect => `<option value="${effect}">${effect}</option>`).join('');
}

function populateFacialHair() {
    facialHairSelect.innerHTML = FACIAL_HAIR.map(style => `<option value="${style}">${style}</option>`).join('');
}

function updateStyleOptionsForGender() {
    populateHairstyleThumbnails();
    facialHairFieldset.style.display = selectedGender === 'male' ? 'block' : 'none';
}

function populateHairstyleThumbnails() {
    const styles = HAIRSTYLES[selectedGender];
    hairstyleThumbnailContainer.innerHTML = '';
    styles.forEach((style, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'hairstyle-thumbnail';
        thumb.innerHTML = `<span class="hairstyle-thumbnail-emoji">${style.emoji}</span><span>${style.name}</span>`;
        thumb.dataset.style = style.name;
        if (index === 0) {
            thumb.classList.add('selected');
            selectedStyle = style.name;
        }
        hairstyleThumbnailContainer.appendChild(thumb);
    });
}

function handleThumbnailClick(event: Event) {
    const target = (event.target as HTMLElement).closest('.hairstyle-thumbnail');
    if (target && target instanceof HTMLElement) {
        updateSelectedThumbnail(target.dataset.style!);
    }
}

function updateSelectedThumbnail(styleName: string) {
    hairstyleThumbnailContainer.querySelectorAll('.hairstyle-thumbnail').forEach(thumb => {
        thumb.classList.toggle('selected', (thumb as HTMLElement).dataset.style === styleName);
    });
    selectedStyle = styleName;
}

// --- GEMINI API CALLS ---
async function generateNewLook() {
    if (!base64ImageData) {
        alert("Please snap or upload a photo first.");
        return;
    }

    loadingIndicator.style.display = 'block';
    generateButton.disabled = true;
    
    try {
        let prompt = `For this photo of a ${selectedGender}, change their hairstyle to a ${selectedStyle}. Make it ${selectedLength} length with ${selectedVolume} volume. The hair color should be ${selectedColor} (hex code) with a ${selectedHairEffect} effect.`;
        if (selectedGender === 'male' && selectedFacialHair !== 'Clean Shaven') {
            prompt += ` Also, give them ${selectedFacialHair}.`;
        }
        prompt += ' Keep the background, face, and clothing the same, focusing only on a realistic hair and/or facial hair transformation.';

        const cleanBase64 = base64ImageData.split(',')[1];
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        let foundImage = false;
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                    const newImageSrc = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    createResultCard(base64ImageData, newImageSrc);
                    foundImage = true;
                    break; 
                }
            }
        }
        
        if (!foundImage) {
            throw new Error(response.text?.trim() || "The AI did not return an image. This can happen due to safety filters. Try a different style.");
        }

    } catch (error) {
        console.error("Error generating image:", error);
        alert(`Sorry, something went wrong: ${error instanceof Error ? error.message : "An unknown error occurred."}`);
    } finally {
        loadingIndicator.style.display = 'none';
        generateButton.disabled = false;
    }
}

// --- RESULT & MODAL HANDLING ---
function createResultCard(beforeSrc: string, afterSrc: string) {
    resultsPlaceholder.style.display = 'none';

    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'comparison-slider';

    sliderContainer.innerHTML = `
        <div class="slider-label before-label">Before</div>
        <div class="slider-label after-label">After</div>
        <img src="${beforeSrc}" alt="Original photo" class="before-image">
        <img src="${afterSrc}" alt="Generated hairstyle" class="after-image">
        <div class="slider-handle"></div>
        <input type="range" min="0" max="100" value="50" class="comparison-range" aria-label="Comparison slider">
    `;

    const afterImage = sliderContainer.querySelector('.after-image') as HTMLImageElement;
    const handle = sliderContainer.querySelector('.slider-handle') as HTMLDivElement;
    const slider = sliderContainer.querySelector('.comparison-range') as HTMLInputElement;

    slider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        afterImage.style.clipPath = `polygon(0 0, ${value}% 0, ${value}% 100%, 0 100%)`;
        handle.style.left = `${value}%`;
    });

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'result-actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-button';
    downloadBtn.textContent = 'Download Look';
    downloadBtn.onclick = () => handleDownload(afterSrc);

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'fullscreen-button';
    fullscreenBtn.textContent = 'View Full Screen';
    fullscreenBtn.onclick = () => openModal(afterSrc);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-button';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.setAttribute('aria-label', 'Delete look');
    deleteBtn.onclick = () => {
        resultCard.style.opacity = '0';
        setTimeout(() => {
            resultCard.remove();
            if (resultsGallery.querySelectorAll('.result-card').length === 0) {
                resultsPlaceholder.style.display = 'block';
            }
        }, 300);
    };
    
    actionsDiv.appendChild(fullscreenBtn);
    actionsDiv.appendChild(downloadBtn);
    resultCard.appendChild(sliderContainer);
    resultCard.appendChild(actionsDiv);
    resultCard.appendChild(deleteBtn);

    resultsGallery.prepend(resultCard);
}

function handleDownload(imageSrc: string) {
    if (!imageSrc) return;
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `hairstyler-look-${Date.now()}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function openModal(imageSrc: string) {
    modalImage.src = imageSrc;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    resetZoom();
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function updateZoom() {
    modalImage.style.transform = `scale(${currentZoom})`;
}

function zoomIn() {
    currentZoom += 0.2;
    updateZoom();
}

function zoomOut() {
    currentZoom = Math.max(0.4, currentZoom - 0.2);
    updateZoom();
}

function resetZoom() {
    currentZoom = 1;
    updateZoom();
}

// --- THEME ---
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    themeToggle.checked = savedTheme === 'light';
    document.body.setAttribute('data-theme', savedTheme);
}

function handleThemeToggle() {
    const newTheme = themeToggle.checked ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    snapButton.addEventListener('click', snapPhoto);
    uploadButton.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', handleFileUpload);
    
    genderRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            selectedGender = (event.target as HTMLInputElement).value as 'male' | 'female';
            updateStyleOptionsForGender();
        });
    });

    hairstyleThumbnailContainer.addEventListener('click', handleThumbnailClick);
    hairEffectsSelect.addEventListener('change', (e) => { selectedHairEffect = (e.target as HTMLSelectElement).value; });
    facialHairSelect.addEventListener('change', (e) => { selectedFacialHair = (e.target as HTMLSelectElement).value; });
    colorPicker.addEventListener('input', (e) => { selectedColor = (e.target as HTMLInputElement).value; });

    const lengthMap: { [key: string]: string } = { '1': 'Short', '2': 'Medium', '3': 'Long' };
    lengthSlider.addEventListener('input', (e) => {
        const val = (e.target as HTMLInputElement).value;
        selectedLength = lengthMap[val];
        lengthValue.textContent = selectedLength;
    });

    const volumeMap: { [key: string]: string } = { '1': 'Low', '2': 'Medium', '3': 'High' };
    volumeSlider.addEventListener('input', (e) => {
        const val = (e.target as HTMLInputElement).value;
        selectedVolume = volumeMap[val];
        volumeValue.textContent = selectedVolume;
    });

    themeToggle.addEventListener('change', handleThemeToggle);
    generateButton.addEventListener('click', generateNewLook);

    // Modal listeners
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    closeModalBtn.addEventListener('click', closeModal);
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
}

// --- RUN APP ---
initialize();