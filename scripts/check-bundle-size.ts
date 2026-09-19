import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const MAX_CHUNK_BYTES = 500_000;
const assetsDirectory = join(import.meta.dir, "../dist/assets");
const javascriptFiles = (await readdir(assetsDirectory)).filter((file) => file.endsWith(".js"));

if (javascriptFiles.length === 0) {
  throw new Error("Nenhum chunk JavaScript foi encontrado em dist/assets.");
}

const chunks = await Promise.all(
  javascriptFiles.map(async (file) => ({
    file,
    bytes: (await stat(join(assetsDirectory, file))).size,
  })),
);
const oversized = chunks.filter((chunk) => chunk.bytes > MAX_CHUNK_BYTES);
const largest = chunks.toSorted((a, b) => b.bytes - a.bytes)[0]!;

if (oversized.length > 0) {
  for (const chunk of oversized) {
    console.error(
      `Chunk acima do limite: ${chunk.file} (${(chunk.bytes / 1000).toFixed(2)} kB > 500 kB).`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    `Bundle aprovado: maior chunk ${largest.file} com ${(largest.bytes / 1000).toFixed(2)} kB.`,
  );
}
