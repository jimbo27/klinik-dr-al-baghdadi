---
name: create-image
description: Use when the user wants an image, illustration, icon, logo, diagram, banner or social-media graphic made.
argument-hint: "[what the image should show]"
disable-model-invocation: true
---

# Create Image

Request: $ARGUMENTS

Before making anything, settle: subject, style, size or aspect ratio, colours or brand, and any text on the image. Ask one question only if the subject is unclear.

Pick the route that fits:

1. **Photo-like or artistic images** → look for a connected image-generation tool (ToolSearch "generate image", e.g. the Canva or Higgsfield connectors). These can cost credits: name the tool and the expected cost and get the user's go-ahead first. Then generate, show the result and offer variations.
2. **Diagrams, icons, logos, charts, simple illustrations, banners with text** → draw it yourself as SVG (or HTML/CSS for layouts), save it in the project or the scratchpad, and send the file to the user. Render it to PNG with Playwright when a raster file is needed.
3. **No suitable tool, or the user wants to use their own generator** → write a ready-to-paste prompt: subject, composition, style, lighting, colours, aspect ratio, and a negative prompt.

Images of real people need their consent; real brands' logos are never presented as official.
