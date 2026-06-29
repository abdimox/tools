import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  fieldName?: string;
  hint?: string;
  maxFiles?: number;
}

export function ImageUploader({ files, onChange, fieldName = '上传图片', hint = '支持 JPG、PNG、WEBP，最多12张，单张不超过10MB', maxFiles = 12 }: Props) {
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, maxFiles);
    onChange(next);
  }

  return (
    <div>
      <label className="upload-zone">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={maxFiles > 1}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <span className="upload-icon"><ImagePlus size={22} /></span>
        <span><strong>{fieldName}</strong><small>{hint}</small></span>
      </label>
      {previews.length > 0 && (
        <div className="upload-previews">
          {previews.map(({ file, url }, index) => (
            <div className="preview-item" key={`${file.name}-${file.lastModified}-${index}`}>
              <img src={url} alt={file.name} />
              <button type="button" aria-label={`删除 ${file.name}`} onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))}>
                <X size={14} />
              </button>
              <span>{index + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
