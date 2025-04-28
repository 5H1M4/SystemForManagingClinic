const fs = require('fs');
const { exec } = require('child_process');

// Write a simple HTML file that will help us convert SVG to ICO
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Generate Favicon</title>
  <script>
    function svgToCanvas() {
      const svg = document.getElementById('svgSource');
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = function() {
        ctx.drawImage(img, 0, 0, 32, 32);
        
        // Convert to data URL and save
        const dataUrl = canvas.toDataURL('image/png');
        document.getElementById('dataUrl').textContent = dataUrl;
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svg));
    }
  </script>
</head>
<body onload="svgToCanvas()">
  <svg id="svgSource" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="30" height="30" rx="4" fill="#3b82f6"/>
    <path d="M20 10V30" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <path d="M10 20H30" stroke="white" stroke-width="4" stroke-linecap="round"/>
  </svg>
  <canvas id="canvas" width="32" height="32" style="border:1px solid #d3d3d3;"></canvas>
  <div>
    <pre id="dataUrl"></pre>
  </div>
</body>
</html>
`;

fs.writeFileSync('favicon-generator.html', html);

console.log('HTML file created. Please open it in a browser and copy the data URL to create the favicon.ico file manually.');
console.log('Alternative: If you have ImageMagick installed, run: convert favicon.svg -resize 32x32 favicon.ico'); 