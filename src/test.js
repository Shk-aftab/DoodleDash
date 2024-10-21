import { pipeline, RawImage } from "@xenova/transformers";

const classifier = await pipeline("image-classification", 'Xenova/quickdraw-mobilevit-small', { quantized: false });

const image = await RawImage.read('https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/blog/ml-web-games/skateboard.png');

const output = await classifier(image.grayscale());
console.log(output);
