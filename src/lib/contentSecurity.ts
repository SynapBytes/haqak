/**
 * Content Security and Attachment Validation Utility
 * Handles filtering of offensive content and validation of attachments
 */

// Comprehensive list of offensive patterns in Arabic and English
const offensivePatterns = [
  // Arabic offensive words (expanded list)
  /\b(شتيمة|سب|قذف|تهديد|جنسي|عنف|إرهاب|قتل|اغتصاب|تحرش)\b/gi,
  /\b(كس|زب|نيك|طيز|خول|حمار|كلب|ديوث|عاهرة|ساقطة)\b/gi,
  /\b(اللعنة|الملعون|ملعون|كافر|مرتد|خائن)\b/gi,
  
  // English offensive words
  /\b(fuck|shit|damn|hell|bitch|asshole|bastard|crap|dick|cock|pussy|ass|whore|slut)\b/gi,
  /\b(rape|kill|murder|suicide|bomb|terrorist|violence|abuse|sexual|porn|xxx|nude)\b/gi,
  /\b(nigger|faggot|retard|idiot|stupid|dumb|moron)\b/gi,
];

// Patterns for detecting potentially problematic content
const suspiciousPatterns = [
  /\b(تهديد|تهدد|سأقتل|سأضرب|سأحرق|سأفجر|سأنتقم)\b/gi,
  /\b(threat|kill|burn|bomb|revenge|attack)\b/gi,
];

// File types that are allowed
const allowedFileTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

// Maximum file sizes (in bytes)
const maxFileSizes: Record<string, number> = {
  'image/jpeg': 5 * 1024 * 1024,      // 5MB
  'image/png': 5 * 1024 * 1024,       // 5MB
  'image/webp': 5 * 1024 * 1024,      // 5MB
  'image/gif': 3 * 1024 * 1024,       // 3MB
  'application/pdf': 10 * 1024 * 1024, // 10MB
  'application/msword': 5 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 5 * 1024 * 1024,
  'application/vnd.ms-excel': 5 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 5 * 1024 * 1024,
  'text/plain': 2 * 1024 * 1024,      // 2MB
};

export interface ContentFilterResult {
  isClean: boolean;
  isSuspicious: boolean;
  offensiveMatches: string[];
  suspiciousMatches: string[];
  reason?: string;
}

export interface AttachmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Detects offensive content in text
 */
export function detectOffensiveContent(text: string): string[] {
  const matches: string[] = [];
  
  for (const pattern of offensivePatterns) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Detects suspicious content patterns
 */
export function detectSuspiciousContent(text: string): string[] {
  const matches: string[] = [];
  
  for (const pattern of suspiciousPatterns) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Comprehensive content filtering
 */
export function filterContent(title: string, description: string): ContentFilterResult {
  const combinedText = `${title} ${description}`;
  
  const offensiveMatches = detectOffensiveContent(combinedText);
  const suspiciousMatches = detectSuspiciousContent(combinedText);
  
  const result: ContentFilterResult = {
    isClean: offensiveMatches.length === 0,
    isSuspicious: suspiciousMatches.length > 0,
    offensiveMatches,
    suspiciousMatches,
  };
  
  if (offensiveMatches.length > 0) {
    result.reason = "محتوى مسيء أو غير لائق تم اكتشافه";
  } else if (suspiciousMatches.length > 0) {
    result.reason = "محتوى يحتوي على تهديدات أو عنف";
  }
  
  return result;
}

/**
 * Validates file attachments
 */
export function validateAttachments(files: File[]): AttachmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (files.length === 0) {
    return { isValid: true, errors, warnings };
  }
  
  if (files.length > 5) {
    errors.push("لا يمكن تحميل أكثر من 5 ملفات");
  }
  
  let totalSize = 0;
  
  for (const file of files) {
    // Check file type
    if (!allowedFileTypes.includes(file.type)) {
      errors.push(`نوع الملف "${file.name}" غير مدعوم`);
      continue;
    }
    
    // Check file size
    const maxSize = maxFileSizes[file.type] || 5 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`حجم الملف "${file.name}" يتجاوز الحد الأقصى المسموح به`);
      continue;
    }
    
    totalSize += file.size;
    
    // Warn if file is large
    if (file.size > 2 * 1024 * 1024) {
      warnings.push(`الملف "${file.name}" كبير الحجم قد يستغرق وقتاً أطول في التحميل`);
    }
  }
  
  // Check total size
  if (totalSize > 20 * 1024 * 1024) {
    errors.push("إجمالي حجم الملفات يتجاوز 20 ميجابايت");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitizes text by removing or replacing offensive content
 */
export function sanitizeText(text: string): string {
  let sanitized = text;
  
  for (const pattern of offensivePatterns) {
    sanitized = sanitized.replace(pattern, '***');
  }
  
  return sanitized;
}

/**
 * Checks if content is suitable for publication
 */
export function isContentSuitable(title: string, description: string): boolean {
  const filterResult = filterContent(title, description);
  return filterResult.isClean && !filterResult.isSuspicious;
}

/**
 * Gets a detailed report of content issues
 */
export function getContentReport(title: string, description: string): string[] {
  const filterResult = filterContent(title, description);
  const issues: string[] = [];
  
  if (filterResult.offensiveMatches.length > 0) {
    issues.push(`تم اكتشاف كلمات مسيئة: ${filterResult.offensiveMatches.join(', ')}`);
  }
  
  if (filterResult.suspiciousMatches.length > 0) {
    issues.push(`تم اكتشاف محتوى مريب: ${filterResult.suspiciousMatches.join(', ')}`);
  }
  
  return issues;
}

/**
 * Validates image files specifically
 */
export function validateImageFile(file: File): AttachmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if it's an image
  if (!file.type.startsWith('image/')) {
    errors.push("الملف يجب أن يكون صورة");
    return { isValid: false, errors, warnings };
  }
  
  // Check file size
  const maxSize = maxFileSizes[file.type] || 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`حجم الصورة يتجاوز الحد الأقصى المسموح به (${maxSize / 1024 / 1024}MB)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
