import Suggest from './Suggest.mjs';

import { deviceFonts, googleFonts } from './fonts.mjs';

const fontInputRegistry = {};

const handleFormChange = (event) => {
    const form = event.currentTarget;
    const fontInputs = form.querySelectorAll('[data-type="font"]');
    
    fontInputs.forEach((fontInput) => {
        const fontFamily = fontInput.value?.trim();
       
        if (fontFamily && googleFonts.includes(fontFamily)) {
            addGoogleFont(fontFamily);
        }
    });
}

export const initFormFonts = (form) => {
    const fontInputs = form.querySelectorAll('[data-type="font"]');

    fontInputs.forEach((fontInput) => {
        const suggest = new Suggest(fontInput, {
            data: deviceFonts.concat(googleFonts),
        });

        fontInputRegistry[fontInput.id] = suggest;
    });

    form.addEventListener('change', handleFormChange);
}

export const disposeFormFonts = (form) => {
    const fontInputs = form.querySelectorAll('[data-type="font"]');

    fontInputs.forEach((fontInput) => {
        fontInput.removeEventListener('change', handleFontChange);

        fontInputRegistry[fontInput.id].dispose();
        delete fontInputRegistry[fontInput.id];
    });
}

function generateGoogleFontUrl(fontName) {
    const formattedName = fontName.replace(/ /g, '+').replace(/[^\w+]/g, '');
    return `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400;700&display=swap`;
}

function addGoogleFont(fontName) {
    const url = generateGoogleFontUrl(fontName);
    let link = document.querySelector(`link[href="${url}"]`);
    if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
    }
}