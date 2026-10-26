/** Lưu file: dùng hộp thoại lưu của Electron, hoặc tải xuống trong trình duyệt. */
export async function saveBytes(name: string, bytes: Uint8Array, mime: string, ext: string): Promise<string | null> {
  if (window.gpaApi) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return window.gpaApi.saveFile({ defaultName: name, base64: btoa(bin), filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return name;
}

export const saveText = (name: string, text: string, mime: string, ext: string) =>
  saveBytes(name, new TextEncoder().encode(text), mime, ext);
