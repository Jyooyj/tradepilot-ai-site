import {
  IMAGE_QUALITY_COPY,
  IMAGE_QUALITY_LIMITS,
  SUPPORTED_IMAGE_TYPES,
} from "../constants/imageQualityConfig";

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bytesToMb(bytes) {
  return toFiniteNumber(bytes) / 1024 / 1024;
}

function uniqueList(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function normalizeLevel(levels) {
  if (levels.includes("error")) return "error";
  if (levels.includes("warning")) return "warning";
  if (levels.includes("minor_warning")) return "minor_warning";
  return "ok";
}

export function validateImageFile(file) {
  const issues = [];
  const suggestions = [];

  if (!file) {
    return {
      ok: false,
      level: "error",
      issues: [IMAGE_QUALITY_COPY.missingFile],
      suggestions: ["重新选择一张清晰的单品图。", IMAGE_QUALITY_COPY.manualFallback],
    };
  }

  const type = String(file.type || "").toLowerCase();
  const sizeMb = bytesToMb(file.size || 0);
  let level = "ok";

  if (!SUPPORTED_IMAGE_TYPES.includes(type)) {
    level = "error";
    issues.push(IMAGE_QUALITY_COPY.unsupportedType);
    suggestions.push("请换成 JPG、PNG 或 WebP 格式后重新上传。");
  }

  if (sizeMb > IMAGE_QUALITY_LIMITS.maxImageSizeMb) {
    level = "error";
    issues.push(`${IMAGE_QUALITY_COPY.fileTooLarge} 当前约 ${sizeMb.toFixed(1)}MB。`);
    suggestions.push("建议压缩到 5MB 以内，或用商品主体截图重新上传。");
  }

  if ((file.size || 0) < IMAGE_QUALITY_LIMITS.minFileSizeKb * 1024) {
    level = "error";
    issues.push(IMAGE_QUALITY_COPY.fileTooSmall);
    suggestions.push("请确认上传的是有效商品图片，或直接手动填写商品信息。");
  } else if ((file.size || 0) < IMAGE_QUALITY_LIMITS.tinyFileSizeKb * 1024) {
    level = level === "error" ? "error" : "minor_warning";
    issues.push(IMAGE_QUALITY_COPY.tinyFileWarning);
    suggestions.push("建议上传更清晰、细节更多的商品图。");
  }

  return {
    ok: level !== "error",
    level,
    issues: uniqueList(issues),
    suggestions: uniqueList(suggestions.length ? suggestions : [IMAGE_QUALITY_COPY.normal]),
  };
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败，请换一张图片再试。"));
    };
    image.src = url;
  });
}

function getSampledPixels(image) {
  const sampleSize = IMAGE_QUALITY_LIMITS.sampleSize;
  const scale = Math.min(1, sampleSize / image.width, sampleSize / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("当前浏览器无法检测图片质量。");
  }

  context.drawImage(image, 0, 0, width, height);
  return {
    width,
    height,
    pixels: context.getImageData(0, 0, width, height).data,
  };
}

function calculateImageStats(sample) {
  const gray = new Float32Array(sample.width * sample.height);
  let sum = 0;

  for (let i = 0, p = 0; i < sample.pixels.length; i += 4, p += 1) {
    const value = sample.pixels[i] * 0.299 + sample.pixels[i + 1] * 0.587 + sample.pixels[i + 2] * 0.114;
    gray[p] = value;
    sum += value;
  }

  const count = gray.length || 1;
  const brightness = sum / count;
  let variance = 0;
  let edgeSum = 0;
  let edgeCount = 0;

  for (let i = 0; i < gray.length; i += 1) {
    const diff = gray[i] - brightness;
    variance += diff * diff;
  }

  for (let y = 1; y < sample.height; y += 1) {
    for (let x = 1; x < sample.width; x += 1) {
      const current = gray[y * sample.width + x];
      const left = gray[y * sample.width + x - 1];
      const top = gray[(y - 1) * sample.width + x];
      edgeSum += Math.abs(current - left) + Math.abs(current - top);
      edgeCount += 2;
    }
  }

  return {
    brightness: Number(brightness.toFixed(1)),
    contrast: Number(Math.sqrt(variance / count).toFixed(1)),
    blurScore: Number((edgeSum / Math.max(edgeCount, 1)).toFixed(1)),
  };
}

export async function analyzeImageQuality(file) {
  const image = await loadImageFromFile(file);
  const sample = getSampledPixels(image);
  const stats = calculateImageStats(sample);
  const issues = [];
  const suggestions = [];
  const levels = [];

  if (image.width < IMAGE_QUALITY_LIMITS.hardMinWidth || image.height < IMAGE_QUALITY_LIMITS.hardMinHeight) {
    levels.push("error");
    issues.push(IMAGE_QUALITY_COPY.resolutionTooSmall);
    suggestions.push("建议上传主体清晰、边长至少 300px 的单品图。");
  } else if (image.width < IMAGE_QUALITY_LIMITS.warningMinWidth || image.height < IMAGE_QUALITY_LIMITS.warningMinHeight) {
    levels.push("warning");
    issues.push(IMAGE_QUALITY_COPY.resolutionTooLow);
    suggestions.push("建议上传主体更清晰、背景更简单的商品图。");
  } else if (image.width < IMAGE_QUALITY_LIMITS.minWidth || image.height < IMAGE_QUALITY_LIMITS.minHeight) {
    levels.push("minor_warning");
    issues.push(IMAGE_QUALITY_COPY.resolutionSlightlyLow);
    suggestions.push("当前图片仍可用于识别，建议识别后人工核对商品名称和品类。");
  }

  if (stats.brightness < IMAGE_QUALITY_LIMITS.darkBrightnessWarning) {
    levels.push("warning");
    issues.push(IMAGE_QUALITY_COPY.tooDark);
    suggestions.push("建议换用光线更好的图片，避免暗部遮住材质和轮廓。");
  } else if (stats.brightness < IMAGE_QUALITY_LIMITS.darkBrightnessMinor) {
    levels.push("minor_warning");
    issues.push(IMAGE_QUALITY_COPY.slightlyDark);
    suggestions.push("当前图片仍可用于识别，建议识别后人工核对材质和细节。");
  }

  if (stats.brightness > IMAGE_QUALITY_LIMITS.brightBrightnessWarning) {
    levels.push("warning");
    issues.push(IMAGE_QUALITY_COPY.tooBright);
    suggestions.push("建议减少过曝或反光，保留商品边缘和细节。");
  } else if (stats.brightness > IMAGE_QUALITY_LIMITS.brightBrightnessMinor) {
    levels.push("minor_warning");
    issues.push(IMAGE_QUALITY_COPY.slightlyBright);
    suggestions.push("当前图片仍可用于识别，建议识别后人工核对轮廓和颜色。");
  }

  if (stats.contrast < IMAGE_QUALITY_LIMITS.lowContrastWarning) {
    levels.push("warning");
    issues.push(IMAGE_QUALITY_COPY.lowContrast);
    suggestions.push("建议使用背景更干净、主体更突出的商品图。");
  } else if (stats.contrast < IMAGE_QUALITY_LIMITS.lowContrastMinor) {
    levels.push("minor_warning");
    issues.push(IMAGE_QUALITY_COPY.slightlyLowContrast);
    suggestions.push("当前图片仍可用于识别，建议识别后人工核对主体和背景。");
  }

  if (stats.blurScore < IMAGE_QUALITY_LIMITS.blurWarningThreshold) {
    levels.push("warning");
    issues.push(IMAGE_QUALITY_COPY.blurry);
    suggestions.push("建议重新拍摄或选择更清晰的商品主图。");
  } else if (stats.blurScore < IMAGE_QUALITY_LIMITS.blurMinorThreshold) {
    levels.push("minor_warning");
    issues.push(IMAGE_QUALITY_COPY.slightlyBlurry);
    suggestions.push("当前图片仍可用于识别，建议识别后人工核对商品名称和品类。");
  }

  return {
    width: image.width,
    height: image.height,
    brightness: stats.brightness,
    contrast: stats.contrast,
    blurScore: stats.blurScore,
    level: normalizeLevel(levels),
    issues: uniqueList(issues),
    suggestions: uniqueList(suggestions.length ? suggestions : [IMAGE_QUALITY_COPY.normal]),
  };
}

export function buildImageQualityMessage(qualityResult) {
  const safeResult = qualityResult && typeof qualityResult === "object" ? qualityResult : {};
  const issues = uniqueList(safeResult.issues || []);
  const level = issues.length
    ? normalizeLevel([safeResult.level === "ok" ? "minor_warning" : safeResult.level || "warning"])
    : "ok";
  const suggestions = uniqueList(
    issues.length
      ? (safeResult.suggestions || [])
      : [IMAGE_QUALITY_COPY.normal],
  );

  const titleMap = {
    ok: "图片质量正常",
    minor_warning: "图片存在轻微质量提醒",
    warning: "图片质量可能影响识别准确性",
    error: "图片暂无法用于识别",
  };
  const summaryMap = {
    ok: IMAGE_QUALITY_COPY.normal,
    minor_warning: "当前图片仍可用于识别，建议在结果生成后人工核对商品名称和品类。",
    warning: "建议上传主体更清晰、背景更简单的商品图，或继续手动填写商品信息。",
    error: "请重新上传图片，或跳过识别并手动填写商品信息。",
  };

  return {
    level,
    title: titleMap[level] || titleMap.ok,
    summary: issues.length ? summaryMap[level] : summaryMap.ok,
    issues,
    suggestions: uniqueList(level === "ok" ? suggestions : [...suggestions, IMAGE_QUALITY_COPY.manualFallback]),
    metrics: {
      width: safeResult.width,
      height: safeResult.height,
      brightness: safeResult.brightness,
      contrast: safeResult.contrast,
      blurScore: safeResult.blurScore,
    },
  };
}

function readConfidence(data, aiProduct) {
  const value = aiProduct?.confidence ?? data?.confidence ?? data?.subjectClarity;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (/low|低|较低|不确定|unknown/.test(lower)) return 0.2;
    if (/medium|中/.test(lower)) return 0.55;
    if (/high|高/.test(lower)) return 0.85;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 1 ? parsed / 100 : parsed;
}

export function buildImageRecognitionMessage(data = {}, aiProduct = {}) {
  const strongReasons = [];
  const minorReasons = [];
  const productName = String(aiProduct.name || aiProduct.productName || "").trim();
  const category = String(aiProduct.category || aiProduct.type || "").trim();
  const confidence = readConfidence(data, aiProduct);

  asArray(data.failureReasons).forEach((reason) => strongReasons.push(reason));
  asArray(data.qualityIssues).forEach((issue) => minorReasons.push(issue));

  if (!productName) strongReasons.push("商品名称为空，模型未能稳定定位商品主体。");
  if (!category || /unknown|未知|无法|不确定/.test(category)) strongReasons.push("模型未能稳定判断品类。");
  if (confidence !== null && confidence < 0.45) strongReasons.push("模型置信度较低。");
  if (data.isMultiProductImage) {
    minorReasons.push("图片中可能包含组合商品，系统会以主要商品或套装进行识别。");
  }
  if (data.isOccluded) strongReasons.push("商品可能被遮挡。");
  if (data.isBlurry) strongReasons.push("图片可能较模糊。");
  if (/low|低|unclear|不清晰/i.test(String(data.subjectClarity || ""))) strongReasons.push("商品主体不够清晰。");
  if (data.fallbackMessage) strongReasons.push(data.fallbackMessage);

  const level = strongReasons.length ? "warning" : minorReasons.length ? "minor_warning" : "ok";
  const issues = uniqueList([...strongReasons, ...minorReasons]);
  const suggestions = level === "warning"
    ? [
        "重新上传主体更清晰、背景更简单的单品图后再试。",
        "也可以继续手动填写商品信息生成进货报告。",
      ]
    : level === "minor_warning"
      ? [
          "当前已完成识别，建议人工核对商品名称、品类和规格。",
          "如果识别不准，可手动修改商品信息。",
        ]
      : ["已根据图片自动回填产品信息，建议继续人工核对关键字段。"];

  return {
    level,
    title: level === "warning" ? "图片识别未能稳定判断商品" : level === "minor_warning" ? "图片识别完成，建议人工复核" : "图片识别完成",
    summary: level === "warning"
      ? "系统可能受到图片模糊、商品遮挡、多个不同品类商品同时出现、背景复杂或商品过于小众等因素影响。"
      : level === "minor_warning"
        ? "当前图片仍可用于识别，系统已自动回填商品信息；如为组合商品或套装，请人工核对字段。"
        : "已根据图片自动回填产品信息，建议继续人工核对关键字段。",
    issues,
    suggestions,
  };
}

export function buildImageRecognitionErrorMessage(errorType = "unknown", detail = "") {
  const networkIssue = errorType === "network" || /fetch|network|abort|timeout|接口|请求/i.test(String(detail));
  return {
    level: "error",
    title: "图片识别未能稳定判断商品",
    summary: networkIssue
      ? "图片识别接口暂时不可用，可能是网络波动、接口超时或请求体过大。"
      : "图片识别没有返回可用商品信息。",
    issues: networkIssue
      ? ["网络或接口异常。"]
      : ["模型返回内容为空，未能提取商品名称或品类。"],
    suggestions: [
      "重新上传主体更清晰的单品图后再试。",
      "继续手动填写商品信息生成报告，产品库、候选产品 PK 和测款复盘仍可正常使用。",
    ],
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}
