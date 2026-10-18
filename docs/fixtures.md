# Fixture provenance

No image or model weights are committed. `scripts/fixtures.js` downloads a dog photograph to ignored `.local/fixtures/a.jpg`, validates its SHA-1 against Wikimedia imageinfo, and generates two other fixtures with Sharp: an invoice text card and a solid-blue negative control. Opaque filenames prevent filename leakage into semantic search.

Dog: **Labrador Retriever (936995)**, credited to PxHere, original https://pxhere.com/en/photo/936995, Wikimedia description https://commons.wikimedia.org/wiki/File:Labrador_Retriever_(936995).jpg . Commons imageinfo lists **CC0**, no attribution required, SHA-1 `c54601da8668d3ba6f0dfeb8a46ea6afb7861649`. Metadata verified using the Commons API during implementation. This is a photo without printed invoice text, not a synthetic embedding fixture.

Generated cards are original programmatically generated test fixtures, released under this repository's MIT license. Sharp's SVG text rendering requires a system font; this Linux test used installed system fonts.

Model: Xenova ONNX conversion of OpenAI CLIP ViT-B/32, pinned revision in `src/models.js`; weights are fetched from Hugging Face. Upstream OpenAI CLIP repository: https://github.com/openai/CLIP (MIT). Conversion: https://huggingface.co/Xenova/clip-vit-base-patch32 . Tesseract.js uses locally cached English traineddata. Check upstream notices before distributing a bundled binary.
