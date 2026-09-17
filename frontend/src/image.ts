export type Mask = {
  id: string;
  label: string;
  reason: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function paint(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  masks: Mask[],
) {
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  context.fillStyle = "#101722";
  for (const mask of masks) {
    // Expand outward to cover edge pixels; never truncate fractional OCR boxes.
    const x = Math.max(0, Math.floor(mask.x) - 2);
    const y = Math.max(0, Math.floor(mask.y) - 2);
    const right = Math.min(canvas.width, Math.ceil(mask.x + mask.width) + 2);
    const bottom = Math.min(canvas.height, Math.ceil(mask.y + mask.height) + 2);
    context.fillRect(x, y, right - x, bottom - y);
  }
}

export async function exportPng(
  image: HTMLImageElement,
  masks: Mask[],
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  paint(canvas, image, masks);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG export failed.")),
      "image/png",
    ),
  );
}

export async function loadImage(file: File): Promise<HTMLImageElement> {
  if (
    !["image/png", "image/jpeg"].includes(file.type) ||
    file.size > 3 * 1024 * 1024
  )
    throw new Error("Choose a PNG or JPEG under 3 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      image.naturalWidth * image.naturalHeight > 6_000_000 ||
      Math.max(image.naturalWidth, image.naturalHeight) > 4096
    )
      throw new Error(
        "Use an image under 6 megapixels and 4096 pixels per side.",
      );
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function exampleFile(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 1100;
  canvas.height = 600;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#18202e";
  c.fillRect(0, 0, 1100, 600);
  c.fillStyle = "#242e3e";
  c.fillRect(0, 0, 1100, 65);
  c.fillStyle = "#b8c3d4";
  c.font = "18px monospace";
  c.fillText("Terminal / sample-app / fictional data", 34, 41);
  c.font = "23px monospace";
  const lines = [
    "$ npm run dev",
    "",
    "Application listening on http://localhost:3000",
    "",
    "CONTACT_EMAIL=alex@example.com",
    "API_KEY=demo-only-secret-123456",
    "",
    "Database connection: ready",
    "Build completed successfully.",
  ];
  lines.forEach((line, index) => {
    c.fillStyle = index === 4 || index === 5 ? "#ffc995" : "#d7e6dc";
    c.fillText(line, 38, 117 + index * 47);
  });
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) =>
        resolve(
          new File([blob!], "fictional-terminal.png", { type: "image/png" }),
        ),
      "image/png",
    ),
  );
}
