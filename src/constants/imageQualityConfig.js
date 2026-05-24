export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const IMAGE_QUALITY_LIMITS = {
  maxImageSizeMb: 5,
  minFileSizeKb: 4,
  tinyFileSizeKb: 16,
  minWidth: 300,
  minHeight: 300,
  warningMinWidth: 200,
  warningMinHeight: 200,
  hardMinWidth: 120,
  hardMinHeight: 120,
  darkBrightnessMinor: 55,
  darkBrightnessWarning: 35,
  brightBrightnessMinor: 225,
  brightBrightnessWarning: 245,
  lowContrastMinor: 20,
  lowContrastWarning: 12,
  blurMinorThreshold: 3.8,
  blurWarningThreshold: 2.2,
  blurErrorThreshold: 1,
  sampleSize: 160,
};

export const IMAGE_QUALITY_COPY = {
  unsupportedType: "当前仅支持 JPG、PNG、WebP 图片。",
  missingFile: "未选择图片，请先上传一张产品图。",
  fileTooLarge: "图片文件较大，可能导致上传失败，建议压缩、截图或换一张更小的图片。",
  fileTooSmall: "图片文件过小，可能不是有效商品图。",
  tinyFileWarning: "图片文件很小，细节可能不足，识别结果可能不稳定。",
  resolutionSlightlyLow: "图片分辨率略低，识别后建议人工核对商品名称和品类。",
  resolutionTooLow: "图片分辨率较低，可能明显影响识别准确性。",
  resolutionTooSmall: "图片分辨率过低，建议更换更清晰的商品图。",
  slightlyDark: "图片略暗，识别后建议人工核对材质和细节。",
  tooDark: "图片明显过暗，商品细节可能无法稳定识别。",
  slightlyBright: "图片略亮，识别后建议人工核对轮廓和颜色。",
  tooBright: "图片明显过亮，商品轮廓可能不清晰。",
  slightlyLowContrast: "图片对比度略低，识别后建议人工核对主体和背景。",
  lowContrast: "图片对比度明显偏低，主体和背景不够分明。",
  slightlyBlurry: "图片存在轻微清晰度提醒，识别后建议人工核对商品名称和品类。",
  blurry: "图片明显模糊，建议重新拍摄或上传更清晰的商品图。",
  severelyBlurry: "图片严重模糊，商品主体几乎无法辨认。",
  normal: "当前图片质量正常，可以继续识别。",
  minorWarning: "图片存在轻微质量提醒，但当前仍可用于识别。",
  manualFallback: "也可以直接手动填写商品信息，系统仍会生成完整进货报告。",
};

export const IMAGE_RECOGNITION_API_FALLBACK_COPY = {
  summary: "当前视觉识别接口暂不可用，已切换为手动填写 / 演示兜底模式，仍可继续生成进货报告。",
  demoTitle: "演示 fallback 已启用",
  demoDisclaimer: "演示 fallback 不代表真实识别结果，请按实物人工核对并修改字段。",
  manualSuggestion: "继续手动填写或修改商品名称、成本、售价、MOQ、材质、目标人群和销售渠道。",
  marketEvidenceSuggestion: "价格分析仍使用人工市场证据填写和搜索参考入口，不会伪造平台价格、销量、播放量或点赞量。",
};
