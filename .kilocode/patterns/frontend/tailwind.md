# Tailwind CSS Patterns

## Основные принципы Tailwind CSS

Tailwind CSS — utility-first CSS framework для быстрой разработки современных интерфейсов.

## Setup

### Installation

```bash
# npm
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init

# Vite + Vue/React
npm create vite@latest my-app
cd my-app
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
      }
    },
  },
  plugins: [],
}
```

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Basic Utilities

### Layout

```html
<!-- Flexbox -->
<div class="flex items-center justify-between">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Grid -->
<div class="grid grid-cols-3 gap-4">
  <div>Col 1</div>
  <div>Col 2</div>
  <div>Col 3</div>
</div>

<!-- Container -->
<div class="container mx-auto px-4">
  Content
</div>
```

### Spacing

```html
<!-- Margin -->
<div class="m-4">    <!-- margin: 1rem -->
<div class="mx-auto"> <!-- margin-left/right: auto -->
<div class="mt-8">    <!-- margin-top: 2rem -->

<!-- Padding -->
<div class="p-6">     <!-- padding: 1.5rem -->
<div class="px-4 py-2"> <!-- padding-x: 1rem, padding-y: 0.5rem -->
```

### Typography

```html
<!-- Font Size & Weight -->
<h1 class="text-4xl font-bold">Heading</h1>
<p class="text-base font-normal">Paragraph</p>
<span class="text-sm font-light">Small text</span>

<!-- Text Color -->
<p class="text-gray-900">Dark text</p>
<p class="text-primary-500">Primary color</p>

<!-- Text Alignment -->
<p class="text-left">Left</p>
<p class="text-center">Center</p>
<p class="text-right">Right</p>
```

### Colors & Backgrounds

```html
<!-- Background -->
<div class="bg-white">White background</div>
<div class="bg-gray-100">Light gray</div>
<div class="bg-primary-500">Primary color</div>

<!-- Gradients -->
<div class="bg-gradient-to-r from-blue-500 to-purple-600">
  Gradient background
</div>

<!-- Border -->
<div class="border border-gray-300 rounded-lg">
  Bordered box
</div>
```

## Component Patterns

### Button

```html
<!-- Primary Button -->
<button class="
  bg-blue-500 hover:bg-blue-600
  text-white font-semibold
  py-2 px-4 rounded
  transition duration-300
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
">
  Click me
</button>

<!-- Secondary Button -->
<button class="
  bg-transparent hover:bg-gray-100
  text-blue-500 font-semibold
  py-2 px-4 border border-blue-500 rounded
  transition duration-300
">
  Secondary
</button>

<!-- Disabled Button -->
<button class="
  bg-gray-300 text-gray-500
  py-2 px-4 rounded
  cursor-not-allowed opacity-50
" disabled>
  Disabled
</button>
```

### Card

```html
<div class="max-w-sm rounded-lg overflow-hidden shadow-lg bg-white">
  <img class="w-full" src="/image.jpg" alt="Card image">

  <div class="px-6 py-4">
    <div class="font-bold text-xl mb-2">Card Title</div>
    <p class="text-gray-700 text-base">
      Card description text goes here.
    </p>
  </div>

  <div class="px-6 pt-4 pb-2">
    <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
      #tag
    </span>
  </div>
</div>
```

### Form Input

```html
<div class="mb-4">
  <label class="block text-gray-700 text-sm font-bold mb-2" for="username">
    Username
  </label>

  <input
    class="
      shadow appearance-none border rounded
      w-full py-2 px-3
      text-gray-700 leading-tight
      focus:outline-none focus:ring-2 focus:ring-blue-500
    "
    id="username"
    type="text"
    placeholder="Username"
  >

  <p class="text-red-500 text-xs italic mt-2">
    Please fill out this field.
  </p>
</div>
```

### Navigation

```html
<nav class="bg-gray-800">
  <div class="container mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <div class="flex items-center">
        <a href="/" class="text-white font-bold text-xl">Logo</a>
      </div>

      <div class="hidden md:block">
        <div class="flex space-x-4">
          <a href="/" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
            Home
          </a>
          <a href="/about" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
            About
          </a>
        </div>
      </div>
    </div>
  </div>
</nav>
```

## Responsive Design

```html
<!-- Mobile first approach -->
<div class="
  text-sm     /* base: small text */
  md:text-base /* medium screens: normal text */
  lg:text-lg   /* large screens: large text */
">
  Responsive text
</div>

<!-- Grid responsive -->
<div class="
  grid grid-cols-1    /* mobile: 1 column */
  md:grid-cols-2      /* tablet: 2 columns */
  lg:grid-cols-3      /* desktop: 3 columns */
  gap-4
">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- Hide/Show based on breakpoint -->
<div class="hidden md:block">
  Visible only on md and up
</div>

<div class="block md:hidden">
  Visible only on mobile
</div>
```

## Dark Mode

```javascript
// tailwind.config.js
export default {
  darkMode: 'class', // or 'media'
  // ...
}
```

```html
<!-- Light and dark variants -->
<div class="
  bg-white dark:bg-gray-800
  text-gray-900 dark:text-white
">
  Content adapts to dark mode
</div>
```

```javascript
// Toggle dark mode
document.documentElement.classList.toggle('dark')
```

## Custom Components with @apply

```css
/* styles.css */
@layer components {
  .btn-primary {
    @apply bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300;
  }

  .card {
    @apply rounded-lg overflow-hidden shadow-lg bg-white;
  }
}
```

```html
<!-- Usage -->
<button class="btn-primary">Click me</button>
<div class="card">Card content</div>
```

## Animation & Transitions

```html
<!-- Hover transitions -->
<button class="
  bg-blue-500 hover:bg-blue-600
  transform hover:scale-105
  transition duration-300 ease-in-out
">
  Hover me
</button>

<!-- Loading spinner -->
<div class="
  animate-spin
  rounded-full
  h-12 w-12
  border-b-2 border-gray-900
"></div>

<!-- Fade in -->
<div class="
  opacity-0 animate-fade-in
">
  Fades in
</div>
```

Custom animations:

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
      }
    }
  }
}
```

## Plugins

### Forms Plugin

```bash
npm install -D @tailwindcss/forms
```

```javascript
// tailwind.config.js
export default {
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

### Typography Plugin

```bash
npm install -D @tailwindcss/typography
```

```html
<article class="prose lg:prose-xl">
  <h1>Article Title</h1>
  <p>Article content...</p>
</article>
```

## Best Practices

### 1. Use @apply sparingly

```css
/* ХОРОШО - simple utilities */
<button class="bg-blue-500 text-white px-4 py-2 rounded">

/* ПЛОХО - @apply для всего */
.btn {
  @apply bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 active:bg-blue-700;
}
```

### 2. Extract components when needed

```jsx
// React component
const Button = ({ children, variant = 'primary' }) => {
  const baseClasses = 'font-semibold py-2 px-4 rounded transition duration-300'
  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  }

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  )
}
```

### 3. Purge unused CSS

```javascript
// tailwind.config.js
export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx,vue,html}',
  ],
  // Tailwind will remove unused styles in production
}
```

### 4. Use semantic class names

```html
<!-- ХОРОШО -->
<div class="container">
  <header class="site-header">

<!-- ПЛОХО - слишком много utilities в HTML -->
<div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div class="flex items-center justify-between h-16 bg-white shadow">
```

## Testing

```jsx
// Component test
import { render } from '@testing-library/react'
import Button from './Button'

test('renders button with correct classes', () => {
  const { container } = render(<Button>Click me</Button>)
  const button = container.querySelector('button')

  expect(button).toHaveClass('bg-blue-500')
  expect(button).toHaveClass('text-white')
})
```

## Performance

### Production Build

```json
// package.json
{
  "scripts": {
    "build:css": "tailwindcss -i ./src/input.css -o ./dist/output.css --minify"
  }
}
```

### JIT Mode (enabled by default in v3)

```javascript
// tailwind.config.js
export default {
  // JIT enabled by default
  // Generate styles on-demand
}
```

## Ресурсы

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind UI](https://tailwindui.com/)
- [Headless UI](https://headlessui.com/)
- [Tailwind Components](https://tailwindcomponents.com/)

---

**Последнее обновление:** 2025-12-30
**Версия:** 1.0
