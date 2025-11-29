# Fractal Presets

This directory contains preset fractal configurations and images that users can quickly load.

## Directory Structure

```
static/presets/
├── images/           # Preset fractal images (JPG, PNG)
├── presets.json     # Preset configuration file
└── README.md        # This file
```

## Adding New Presets

### 1. Add Image Files

Place your fractal images in the `images/` directory. Supported formats:

- `.jpg` / `.jpeg`
- `.png`
- `.webp`

**Required image specifications:**

- Size: 310px × 194px (exact dimensions)
- Format: JPG (for smaller file sizes)
- Quality: High enough to show fractal detail

### 2. Update presets.json

Add an entry to the `presets.json` file with the following structure:

```json
{
  "id": "unique_preset_id",
  "title": "Display Name",
  "image": "filename.jpg",
  "fractal": "mandelbrot",
  "zoom": 364.091,
  "offsetX": -0.2351,
  "offsetY": 0.8272,
  "theme": "Rainbow",
  "description": "Optional description of the preset"
}
```

### Field Descriptions

- **id**: Unique identifier for the preset
- **title**: Display name shown in the UI
- **image**: Filename of the image in the `images/` directory
- **fractal**: Fractal type (`mandelbrot`, `julia`, etc.)
- **zoom**: Zoom level (number)
- **offsetX**: X offset coordinate (number)
- **offsetY**: Y offset coordinate (number)
- **theme**: Color scheme name (`Classic`, `Rainbow`, `Fire`, etc.)
- **description**: Optional description text

### 3. Example Entry

```json
{
  "id": "seahorse_valley",
  "title": "Seahorse Valley",
  "image": "seahorse_valley.jpg",
  "fractal": "mandelbrot",
  "zoom": 364.091,
  "offsetX": -0.2351,
  "offsetY": 0.8272,
  "theme": "Rainbow",
  "description": "Beautiful seahorse-like patterns in the Mandelbrot set"
}
```

## How Presets Work

1. **Loading**: Presets are loaded from `presets.json` when the app starts
2. **Display**: Images are shown in a grid in the right panel "Presets" section
3. **Selection**: Clicking a preset loads the fractal with the specified parameters
4. **Fallback**: If no presets are found, a placeholder message is shown

## Tips

- Use descriptive titles and IDs
- Keep image file sizes reasonable (< 500KB each)
- Test your presets to ensure they load correctly
- Consider adding presets that showcase different fractal types and zoom levels
- Use consistent naming conventions for your image files
