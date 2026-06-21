import { FileInfo } from '../types';

/**
 * Hiển thị hộp thoại chọn 1 file .docx trên máy tính
 */
export const selectLocalFile = async (): Promise<FileInfo | null> => {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'Word Documents',
          accept: {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
          }
        }
      ],
      multiple: false,
    });
    
    const file = await handle.getFile();
    return {
      id: file.name + '-' + file.lastModified,
      name: file.name,
      path: file.name,
      file: file,
      handle: handle
    };
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('Lỗi khi chọn file:', err);
    }
    return null;
  }
};

/**
 * Hiển thị hộp thoại chọn 1 thư mục trên máy tính
 */
export const selectLocalFolder = async (mode: 'read' | 'readwrite' = 'read'): Promise<FileInfo | null> => {
  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: mode
    });
    return {
      id: handle.name,
      name: handle.name,
      path: handle.name,
      handle: handle
    };
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('Lỗi khi chọn thư mục:', err);
    }
    return null;
  }
};

/**
 * Đọc đệ quy tất cả các file .docx trong một thư mục
 */
export const scanFolderRecursive = async (
  dirHandle: any, 
  currentPath: string = ''
): Promise<FileInfo[]> => {
  const files: FileInfo[] = [];
  
  try {
    for await (const entry of dirHandle.values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file') {
        if (entry.name.toLowerCase().endsWith('.docx') && !entry.name.startsWith('~$')) {
          const file = await entry.getFile();
          files.push({
            id: entryPath + '-' + file.lastModified,
            name: entry.name,
            path: entryPath,
            file: file,
            handle: entry,
            parentHandle: dirHandle
          });
        }
      } else if (entry.kind === 'directory') {
        const subFiles = await scanFolderRecursive(entry, entryPath);
        files.push(...subFiles);
      }
    }
  } catch (err) {
    console.error('Lỗi khi quét thư mục đệ quy:', err);
  }
  
  return files;
};

/**
 * Đọc dữ liệu file thành ArrayBuffer
 */
export const readFileAsArrayBuffer = async (fileInfo: FileInfo): Promise<ArrayBuffer> => {
  if (fileInfo.file) {
    return await fileInfo.file.arrayBuffer();
  } else if (fileInfo.handle) {
    const file = await fileInfo.handle.getFile();
    return await file.arrayBuffer();
  }
  throw new Error("Không thể đọc file: thiếu dữ liệu file local.");
};

/**
 * Copy/Lưu một file với tên mới (thêm tag _valid hoặc _invalid) vào thư mục đích
 */
export const copyFileToFolder = async (
  sourceFileInfo: FileInfo, 
  destDirHandle: any, 
  tag: '_valid' | '_invalid'
): Promise<string> => {
  try {
    const sourceFile = sourceFileInfo.file || await sourceFileInfo.handle.getFile();
    
    // Tách tên file và phần mở rộng
    const originalName = sourceFile.name;
    const lastDotIndex = originalName.lastIndexOf('.');
    const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
    const extension = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '.docx';
    
    const newFileName = `${baseName}${tag}${extension}`;
    
    // Tạo file mới trong thư mục đích
    const newFileHandle = await destDirHandle.getFileHandle(newFileName, { create: true });
    const writable = await newFileHandle.createWritable();
    
    // Ghi nội dung file gốc sang file mới
    const buffer = await sourceFile.arrayBuffer();
    await writable.write(buffer);
    await writable.close();
    
    return newFileName;
  } catch (err) {
    console.error('Lỗi khi copy file:', err);
    throw err;
  }
};

/**
 * Tạo một thư mục con bên trong thư mục chỉ định
 */
export const createSubfolder = async (parentDirHandle: any, folderName: string): Promise<any> => {
  try {
    return await parentDirHandle.getDirectoryHandle(folderName, { create: true });
  } catch (err) {
    console.error('Lỗi khi tạo thư mục con:', err);
    throw err;
  }
};

/**
 * Xóa một file khỏi thư mục
 */
export const deleteFileFromFolder = async (parentDirHandle: any, fileName: string): Promise<void> => {
  try {
    await parentDirHandle.removeEntry(fileName);
  } catch (err) {
    console.error('Lỗi khi xóa file:', err);
    throw err;
  }
};
