import { getEl } from "../../utils/dom.js";

/**
 * DigitCounter for smooth animated clock digits
 */
export class DigitCounter {
  constructor(parent, initialValue = '0') {
    this.parent = parent;
    this.currentValue = null;
    this.element = this.createDigitElement();
    this.parent.appendChild(this.element);
    this.container = this.element.querySelector('.counter-column-container');
    this.update(initialValue);
  }

  createDigitElement() {
    const wrapper = document.createElement('div');
    wrapper.className = 'counter-column-wrapper';
    const container = document.createElement('div');
    container.className = 'counter-column-container';

    for (let i = 0; i <= 9; i++) {
      const digit = document.createElement('div');
      digit.className = 'counter-digit';
      digit.textContent = i;
      container.appendChild(digit);
    }

    wrapper.appendChild(container);
    return wrapper;
  }

  update(newValue) {
    const isImmersive = document.body.classList.contains('tv-mode') || 
                        document.body.classList.contains('fullscreen-active');
    const digitHeight = isImmersive ? 40 : 60;
    
    if (this.currentValue === newValue && this.lastHeight === digitHeight) return;
    
    this.currentValue = newValue;
    this.lastHeight = digitHeight;
    
    const offset = -parseInt(newValue, 10) * digitHeight;
    this.container.style.transform = `translateY(${offset}px)`;
  }
}

let digitCounters = [];

export function updateClock() {
  const timeEl = getEl('tv-time');
  const dateEl = getEl('tv-date');
  if (!timeEl || !dateEl) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit'
  });

  const chars = timeStr.split('');

  if (digitCounters.length === 0) {
    timeEl.innerHTML = '';
    chars.forEach(char => {
      if (/\d/.test(char)) {
        digitCounters.push(new DigitCounter(timeEl, char));
      } else {
        const sep = document.createElement('div');
        sep.className = 'counter-separator';
        sep.textContent = char;
        timeEl.appendChild(sep);
        digitCounters.push({ update: (val) => { sep.textContent = val; } });
      }
    });
  }

  chars.forEach((char, i) => {
    if (digitCounters[i]) digitCounters[i].update(char);
  });

  dateEl.textContent = now.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const headerTime = getEl('header-time-val');
  if (headerTime) headerTime.textContent = timeStr.replace(/^0/, '');
}

export async function updateWeather() {
  const weatherEl = getEl('tv-weather');
  if (!weatherEl) return;

  try {
    const lat = 8.3569;
    const lon = 124.8622;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.current) {
      const temp = Math.round(data.current.temperature_2m);
      weatherEl.innerHTML = `<span class="weather-temp">${temp}°C</span>`;
    }
  } catch (err) {
    console.error("Weather fetch failed:", err);
  }
}
