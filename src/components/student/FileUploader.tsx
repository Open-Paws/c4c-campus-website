/**
 * File Uploader Component
 * Drag-and-drop file upload for assignment submissions
 */
import React, { useState, useRef } from 'react';
import { validateFile, formatFileSize, getFileIcon } from '@/lib/file-upload';

interface FileUploaderProps {
  assignmentId: string;
  allowedTypes: string[];
  maxSizeMB: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FileUploader({
  assignmentId,
  allowedTypes,
  maxSizeMB,
  onSuccess,
  onCancel
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError('');

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validation = validateFile(selectedFile, {
      maxSizeMB,
      allowedTypes
    });

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const supabase = (window as any).supabase;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('You must be logged in');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress (real implementation would use XMLHttpRequest for progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Success!
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err: any) {
      setError(err.message);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <div className="space-y-3">
            <div className="text-5xl">📎</div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Allowed types: {allowedTypes.join(', ')}
              </p>
              <p className="text-sm text-gray-500">
                Maximum size: {maxSizeMB}MB
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept={allowedTypes.map(t => `.${t}`).join(',')}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="text-4xl flex-shrink-0">
                {getFileIcon(file.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                {uploading && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>
            {!uploading && (
              <button
                onClick={handleRemoveFile}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Remove file"
              >
                <span className="text-2xl">&times;</span>
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Submit Assignment'}
        </button>
      </div>
    </div>
  );
}
