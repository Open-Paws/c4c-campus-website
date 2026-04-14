/**
 * Certificate Card Component
 * Displays a certificate with download and verification options
 */

import React, { useState } from 'react';

// Certificate type matching schema.sql certificates table
interface Certificate {
  id: string;
  user_id: string;
  course_id: number;
  template_id?: string;
  certificate_code: string; // Unique code used for verification
  issued_date: string;
  expiry_date?: string;
  student_name: string;
  course_title: string;
  completion_date?: string;
  final_grade?: string;
  pdf_url?: string; // URL to download PDF
  metadata?: {
    hours?: number;
    [key: string]: unknown;
  };
}

interface CertificateCardProps {
  certificate: Certificate;
}

export default function CertificateCard({ certificate }: CertificateCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const courseName = certificate.course_title ?? 'Course';
  const hours = certificate.metadata?.hours;

  // Use completion_date if available, fall back to issued_date
  const displayDate = certificate.completion_date ?? certificate.issued_date;
  const completionDate = displayDate
    ? new Date(displayDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';

  const handleDownload = async () => {
    // Use pdf_url from schema (not download_url)
    const downloadUrl = certificate.pdf_url;
    if (!downloadUrl) {
      alert('PDF is not available for this certificate.');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate-${certificate.certificate_code}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to download certificate. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    // Use certificate_code as the verification identifier (it's unique per schema)
    const verificationUrl = `${window.location.origin}/verify/${certificate.certificate_code}`;

    if (navigator.share) {
      navigator.share({
        title: `${courseName} Certificate`,
        text: `I completed ${courseName} at C4C Campus!`,
        url: verificationUrl
      }).catch(err => console.log('Share failed:', err));
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(verificationUrl).then(() => {
        alert('Verification link copied to clipboard!');
      });
    }
  };

  const handleCopyVerificationCode = () => {
    // Use certificate_code as it's the unique identifier
    navigator.clipboard.writeText(certificate.certificate_code).then(() => {
      alert('Certificate code copied to clipboard!');
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Certificate Preview */}
      <div className="bg-gradient-to-br from-green-50 to-white p-8 border-b border-gray-200">
        <div className="text-center">
          <div className="inline-block p-4 bg-white rounded-full shadow-sm mb-4">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{courseName}</h3>
          <p className="text-sm text-gray-600">Certificate of Completion</p>
        </div>
      </div>

      {/* Certificate Details */}
      <div className="p-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Certificate Code:</span>
            <span className="font-mono font-semibold text-gray-900">
              {certificate.certificate_code}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Completion Date:</span>
            <span className="font-semibold text-gray-900">{completionDate}</span>
          </div>

          {hours != null && hours > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Course Hours:</span>
              <span className="font-semibold text-gray-900">{hours} hours</span>
            </div>
          )}

          <div className="flex justify-between items-start text-sm pt-2 border-t border-gray-100">
            <span className="text-gray-600">Certificate Code:</span>
            <button
              onClick={handleCopyVerificationCode}
              className="font-mono text-xs text-blue-600 hover:text-blue-800 underline text-right break-all max-w-[200px]"
              title="Click to copy"
            >
              {certificate.certificate_code.length > 16
                ? `${certificate.certificate_code.substring(0, 16)}...`
                : certificate.certificate_code}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download PDF
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            title="Share certificate"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Verification Link */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <a
            href={`/verify/${certificate.certificate_code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Verify Certificate Authenticity
          </a>
        </div>
      </div>
    </div>
  );
}
