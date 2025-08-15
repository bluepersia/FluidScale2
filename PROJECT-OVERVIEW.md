FluidScale is a JavaScript runtime interpolation engine that reads media queries and automatically interpolates the values.

## Overview

FluidScale enables responsive design by dynamically interpolating CSS property values based on media queries. It parses stylesheets at runtime, identifies fluid properties, and computes their values for different viewport sizes.

## Key Features

- Parses CSS stylesheets for fluid properties (e.g., font-size, padding, margin)
- Supports both standard and shorthand CSS properties
- Handles media queries and interpolates values between breakpoints
- Designed for use in modern web applications

## Usage

1. Ensure your stylesheets are accessible (served from the same origin).
2. Import and initialize FluidScale in your application:

```js
import initFluidScale from "fluidscale";
initFluidScale();
```

3. Write your CSS using fluid properties and media queries. FluidScale will automatically interpolate values at runtime.

## Architecture

- **Parser:** Reads and batches CSS rules from stylesheets.
- **Batch Processor:** Groups rules by media query breakpoints.
- **Interpolator:** Calculates min/max values and interpolates between them.

## Example

```css
.selector {
  font-size: 16px;
}
@media (min-width: 600px) {
  .selector {
    font-size: 24px;
  }
}
```

FluidScale will interpolate `font-size` between 16px and 24px as the viewport width changes from 0 to 600px.

## Limitations

- Cross-origin stylesheets are not supported due to browser security restrictions.
- Advanced CSS functions (e.g., `min()`, `max()`, decimals) are not fully supported yet.

## Contributing

See the repository README for contribution guidelines.
