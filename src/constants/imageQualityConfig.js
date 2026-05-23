export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const IMAGE_QUALITY_LIMITS = {
  maxImageSizeMb: 5,
  minFileSizeKb: 4,
  tinyFileSizeKb: 16,
  minWidth: 300,
  minHeight: 300,
  hardMinWidth: 120,
  hardMinHeight: 120,
  darkBrightness: 45,
  brightBrightness: 235,
  lowContrast: 18,
  blurScore: 7,
  sampleSize: 160,
};

export const IMAGE_QUALITY_COPY = {
  unsupportedType: "当前仅支持 JPG、PNG、WebP 图片。",
  missingFile: "未选择图片，请先上传一张产品图。",
  fileTooLarge: "图片文件较大，可能导致上传失败，建议压缩、截图或换一张更小的图片。",
  fileTooSmall: "图片文件过小，可能不是有效商品图。",
  tinyFileWarning: "图片文件很小，细节可能不足，识别结果可能不稳定。",
  resolutionTooLow: "图片分辨率较低，可能影响识别准确性。",
  resolutionTooSmall: "图片分辨率过低，建议更换更清晰的商品图。",
  tooDark: "图片过暗，商品细节可能无法稳定识别。",
  tooBright: "图片过亮，商品轮廓可能不清晰。",
  lowContrast: "图片对比度偏低，主体和背景不够分明。",
  blurry: "图片疑似模糊，建议重新拍摄或上传更清晰的商品图。",
  normal: "当前图片质量正常，可以继续识别。",
  manualFallback: "也可以直接手动填写商品信息，系统仍会生成完整进货报告。",
};
