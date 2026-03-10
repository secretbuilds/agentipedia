import type { CodeSnapshot } from "@/types/run";

export async function resolveCodeSnapshot(
  codeSnapshot: CodeSnapshot | null,
  codeFileUrl: string,
  codeFilename: string,
): Promise<CodeSnapshot | null> {
  if (codeSnapshot !== null && Object.keys(codeSnapshot).length > 0) {
    return codeSnapshot;
  }

  if (!codeFileUrl) {
    return null;
  }

  try {
    const response = await fetch(codeFileUrl);
    if (!response.ok) {
      console.error(
        `resolveCodeSnapshot: failed to fetch ${codeFileUrl}: ${response.status}`,
      );
      return null;
    }

    const content = await response.text();
    const filename = codeFilename || "code.py";
    return { [filename]: content };
  } catch (err) {
    console.error("resolveCodeSnapshot: fetch error:", err);
    return null;
  }
}
