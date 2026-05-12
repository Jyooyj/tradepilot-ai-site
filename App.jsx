import React, { useMemo, useState } from "react";

const initialProduct = {
  name: "蝴蝶结珍珠耳夹",
  category: "饰品 / 小商品",
  cost: "3.8",
  price: "19.9",
  moq: "100",
  material: "合金 + 仿珍珠",
  audience: "18-25岁女生、学生党、通勤人群",
  channel: "小红书 / 抖音 / 校园私域",
  supplier: "支持混批，7天补货，可定制包装",
  keywords: "温柔风、法式、不打耳洞、学生党、春夏氛围感",
  competitorPrice: "15.9-29.9元",
  logistics: "小件轻货，包装成本低",
  note: "适合春夏穿搭、校园摆摊、礼物场景，建议先拿样拍图测款。",
};

const blankProduct = {
  name: "",
  category: "",
  cost: "",
  price: "",
  moq: "",
  material: "",
  audience: "",
  channel: "",
  supplier: "",
  keywords: "",
  competitorPrice: "",
  logistics: "",
  note: "",
};

const demoProducts = [
  {
    name: "蝴蝶结珍珠耳夹",
    category: "饰品 / 耳饰",
    cost: "3.8",
    price: "19.9",
    moq: "100",
    material: "合金 + 仿珍珠",
    audience: "18-25岁女生、学生党、通勤人群、礼物消费人群",
    channel: "小红书 / 抖音 / 校园私域",
    supplier: "支持混批，7天补货，可提供礼盒包装",
    keywords: "法式、温柔风、不打耳洞、春夏氛围感、礼物推荐",
    competitorPrice: "15.9-29.9元",
    logistics: "小件轻货，包装成本低",
    note: "适合做小红书穿搭场景和礼物场景测款。",
  },
  {
    name: "奶油色大肠发圈",
    category: "发饰 / 女生日用小商品",
    cost: "2.1",
    price: "12.9",
    moq: "200",
    material: "绒感布料 / 弹力发绳",
    audience: "16-28岁女生、学生党、宿舍人群、通勤女性",
    channel: "小红书 / 抖音 / 校园社群",
    supplier: "支持混批，10天补货，颜色可选",
    keywords: "氛围感发圈、宿舍好物、低成本变精致、显发量",
    competitorPrice: "8.8-25.9元",
    logistics: "轻货，适合组合销售",
    note: "单价低但同质化强，建议做套装和颜色组合测款。",
  },
  {
    name: "宿舍桌面香薰摆件",
    category: "家居生活 / 宿舍好物",
    cost: "12.5",
    price: "49.9",
    moq: "120",
    material: "玻璃瓶 + 香薰精油 + 木盖",
    audience: "大学生、宿舍党、办公室人群、礼物消费人群",
    channel: "小红书 / 校园私域 / 摆摊市集",
    supplier: "支持混批，15天补货，需要防震包装",
    keywords: "宿舍氛围感、桌面改造、礼物、治愈、生活方式",
    competitorPrice: "39.9-89.9元",
    logistics: "玻璃瓶易碎，包装和运费成本较高",
    note: "适合拍宿舍桌面改造和氛围图，但要重点核算破损和运费。",
  },
  {
    name: "国风城市贴纸套装",
    category: "文创 / 贴纸 / 旅行纪念",
    cost: "4.6",
    price: "18.8",
    moq: "60",
    material: "防水PET贴纸 + 卡纸包装",
    audience: "大学生、手帐爱好者、景区游客、文创市集人群",
    channel: "小红书 / 校园市集 / 文旅摊位",
    supplier: "支持混批，7天补货，可定制城市主题",
    keywords: "国风、城市记忆、手帐、文旅、市集、收藏",
    competitorPrice: "12.9-29.9元",
    logistics: "轻货，包装成本低，适合组合装",
    note: "适合做节日市集和校园社团活动场景测款。",
  },
  {
    name: "透明防摔手机壳挂绳套装",
    category: "数码周边 / 手机壳 / 挂绳",
    cost: "6.2",
    price: "29.9",
    moq: "300",
    material: "TPU透明壳 + 尼龙挂绳",
    audience: "学生党、通勤人群、喜欢个性化手机配件的人群",
    channel: "抖音 / 摆摊市集 / 1688批发复购",
    supplier: "支持补货，但不同机型需分开备货",
    keywords: "防摔、挂绳、通勤、解放双手、手机配件",
    competitorPrice: "19.9-39.9元",
    logistics: "轻货，机型库存需要拆分管理",
    note: "适合短视频演示，但首单机型太多会带来滞销风险。",
  },
  {
    name: "便携去污湿巾组合装",
    category: "低价日用 / 清洁小商品",
    cost: "1.2",
    price: "8.8",
    moq: "500",
    material: "无纺布湿巾 / 独立包装",
    audience: "校园宿舍、办公室、宝妈、社群团购用户",
    channel: "校园私域 / 社群团购 / 1688批发复购",
    supplier: "支持稳定补货，起订量较高",
    keywords: "低价引流、宿舍清洁、办公室、组合装、复购",
    competitorPrice: "6.9-12.9元",
    logistics: "小件但走量，适合搭售",
    note: "单件利润薄，更适合作为社群引流和组合销售。",
  },
];

const flowSteps = [
  ["上传产品图", "用样品图或供应商图先判断视觉卖点。"],
  ["AI识别推断", "补全品类、材质、人群和内容关键词。"],
  ["利润测算", "估算单件成本、毛利率和首批压货资金。"],
  ["风险判断", "提示MOQ、补货周期、同质化和物流风险。"],
  ["内容测款", "生成小红书图文方向和抖音短视频脚本。"],
  ["产品库", "把每次判断保存为可比较的产品记录。"],
  ["候选PK", "对比评分、利润、风险和渠道适配。"],
  ["测款复盘", "用真实互动、询单和成交数据决定补货。"],
];

const painPoints = ["凭感觉拿货", "MOQ压货", "利润算不清", "爆款潜力难判断", "内容测款没方向", "进货后缺少复盘"];

const statusOptions = ["全部", "准备拿样", "正在测款", "建议补货", "暂不考虑"];

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const categoryTemplates = {
  jewelry: {
    label: "饰品类",
    marketType: "饰品 / 礼物 / 穿搭小商品",
    focus: ["佩戴场景", "礼物属性", "材质质感", "过敏风险", "包装溢价", "佩戴图", "同质化"],
    insight: "这类产品不能只看款式好不好看，更要看佩戴图、材质信任感和礼物包装是否能支撑溢价。",
    cover: "这款配饰值不值得拿样？先看佩戴图和材质信任感",
    titles: (product) => [
      `${product.name || "这款饰品"}，真正影响转化的是佩戴图`,
      "低预算礼物感配饰，包装和质感能不能撑住售价？",
      "饰品拿货前先看这4点：材质、过敏、佩戴场景、同质化",
      "小红书测饰品：平铺图和上身图差别有多大",
    ],
    script: [
      "0-2秒：展示平铺图与佩戴图的第一眼差异",
      "3-7秒：特写材质、扣头、光泽和包装细节",
      "8-13秒：切换通勤、约会、礼物三个佩戴场景",
      "14-18秒：说明过敏风险、材质信息和售后承诺",
      "结尾：让用户投票更想买自用款还是礼物款",
    ],
    imageAdvice: "必须补佩戴图、近景材质图和包装图；只有白底平铺会显得普通，难以支撑溢价。",
    contentRisk: "饰品同质化高，且过敏、掉色、质感翻车会直接伤害信任，需要提前说明材质和保养方式。",
    differentiation: ["补一张真实佩戴图，突出脸型/穿搭适配", "增加礼物包装或手写卡片，提高溢价理由", "用材质说明和售后承诺降低过敏、掉色疑虑"],
    testActions: ["拍摄佩戴图、包装开箱、材质特写各1组", "小红书测试自用穿搭和礼物推荐两个标题方向", "记录收藏率、评论询问材质次数和私信询价量"],
    contentWords: ["礼物", "穿搭", "佩戴", "法式", "通勤", "约会", "小红书", "精致", "包装"],
  },
  hair_accessory: {
    label: "发饰类",
    marketType: "发饰 / 校园低价小商品",
    focus: ["颜色组合", "套装销售", "宿舍场景", "低客单价", "同质化风险", "上头效果", "私域成交"],
    insight: "发饰类单价低，适合作为引流品或套装销售，但需要靠颜色组合和上头效果降低同质化。",
    cover: "发饰不是只看便宜，关键看颜色组合和上头效果",
    titles: (product) => [
      `${product.name || "这款发饰"}适合宿舍姐妹拼单吗？`,
      "低客单发饰怎么卖：单件引流还是套装提升客单？",
      "不同发量试戴同一款发饰，效果差别很明显",
      "校园群测发饰：哪个颜色最容易被问链接？",
    ],
    script: [
      "0-2秒：普通发型和佩戴后的上头效果对比",
      "3-7秒：展示颜色组合、弹力、夹力或褶皱细节",
      "8-13秒：宿舍、上课、通勤三个使用场景快速切换",
      "14-18秒：展示单件价与套装价，强调拼单更划算",
      "结尾：评论区投票最想要的颜色组合",
    ],
    imageAdvice: "重点拍上头效果、颜色矩阵和套装组合图；发饰需要真人或半真人场景降低廉价感。",
    contentRisk: "低价发饰容易撞款，单件利润有限，若不做颜色组合和套装，很难拉开客单价。",
    differentiation: ["做3件/5件颜色套装，提升客单价", "用宿舍、校园群和姐妹拼单场景强化购买理由", "拍不同发量上头效果，减少用户担心不适配"],
    testActions: ["测试单件引流价和套装价两个版本", "在校园群收集颜色投票，再决定首批配色", "短视频重点拍上头前后对比和颜色矩阵"],
    contentWords: ["颜色", "套装", "宿舍", "校园", "姐妹", "低价", "上头", "拼单", "私域"],
  },
  home_lifestyle: {
    label: "家居生活类",
    marketType: "家居生活 / 宿舍办公室好物",
    focus: ["物流体积", "易碎风险", "包装成本", "生活方式场景", "宿舍适配", "氛围图", "运费影响"],
    insight: "家居生活类产品更依赖场景图和氛围感，但物流、包装和破损风险会明显影响真实利润。",
    cover: "家居小物好不好卖，先看场景图和物流成本",
    titles: (product) => [
      `${product.name || "这款家居小物"}能不能成为宿舍氛围感好物？`,
      "家居生活类拿货前，一定要把运费和破损算进去",
      "宿舍桌面改造：这个小物能不能提升幸福感？",
      "氛围图能种草，但真实利润要看包装成本",
    ],
    script: [
      "0-2秒：展示使用前后的宿舍/桌面氛围对比",
      "3-8秒：展示尺寸、材质、包装保护和细节质感",
      "9-14秒：说明适合宿舍、办公室或礼物场景",
      "15-20秒：拆解售价、运费、包装和破损风险",
      "结尾：让用户选择更想看宿舍版还是办公室版",
    ],
    imageAdvice: "优先拍氛围场景图、尺寸参照图和包装保护图，避免只有孤立产品图。",
    contentRisk: "家居品若体积大或易碎，运费、包装和售后破损会吃掉利润，需要先确认发货保护。",
    differentiation: ["用宿舍/办公室真实场景图增强代入感", "把尺寸、重量、包装保护说清楚，降低售后风险", "做套装或礼物版，给用户一个完整生活方式场景"],
    testActions: ["拍摄宿舍桌面、办公室桌面、礼物开箱三组图", "先小批量测试破损率和用户对运费的接受度", "内容标题分别测试氛围感、收纳效率和礼物属性"],
    contentWords: ["宿舍", "办公室", "氛围", "生活方式", "桌面", "治愈", "礼物", "收纳", "小红书"],
  },
  stationery_cultural: {
    label: "文创类",
    marketType: "文创 / 校园市集 / 文旅小商品",
    focus: ["审美垂直度", "文创调性", "节日文旅场景", "收藏属性", "复购弱点", "市集适配", "文化人群"],
    insight: "文创类产品需要明确人群审美和使用场景，不能只靠“好看”判断，应重点看内容叙事和场景适配。",
    cover: "文创小商品要卖故事，不只是卖图案",
    titles: (product) => [
      `${product.name || "这款文创"}适合校园市集还是文旅摊位？`,
      "文创产品测款：审美垂直度比低价更重要",
      "国风/城市记忆类小物，怎么讲出购买理由？",
      "好看不等于好卖，文创拿货前先看人群和场景",
    ],
    script: [
      "0-2秒：展示图案细节和文化主题",
      "3-8秒：说明设计故事、适合人群和使用场景",
      "9-14秒：展示手帐、钥匙、书包或礼物包装应用",
      "15-20秒：说明市集、校园、文旅渠道的差异",
      "结尾：让用户投票最喜欢哪个主题或城市款",
    ],
    imageAdvice: "要拍使用场景、套装陈列和故事卡；文创只拍单品会弱化调性和收藏感。",
    contentRisk: "文创审美垂直，复购通常弱于日用品，如果故事和场景不清楚，容易只被夸好看但不成交。",
    differentiation: ["给产品增加主题故事卡或城市/节日限定标签", "用套装陈列提高收藏感和客单价", "优先测试校园、市集、文旅三类场景的反馈差异"],
    testActions: ["做3个主题标题测试：审美、纪念、送礼", "在线下市集观察停留率和询价率", "记录用户最常问的主题、城市和用途"],
    contentWords: ["文创", "国风", "手帐", "收藏", "城市", "节日", "文旅", "市集", "校园"],
  },
  phone_accessory: {
    label: "数码周边类",
    marketType: "数码周边 / 手机配件",
    focus: ["机型适配", "更新周期", "个性化表达", "库存滞销", "款式迭代", "短视频演示", "机型变化"],
    insight: "手机周边类要注意机型库存风险，热门款生命周期短，适合小批量快测快补。",
    cover: "手机周边别盲目囤货，机型库存才是最大风险",
    titles: (product) => [
      `${product.name || "这款手机周边"}适合快测，但不适合盲目压机型`,
      "手机壳/挂绳拿货前，先算清楚机型库存风险",
      "短视频能展示效果，但热门款生命周期很短",
      "学生党手机配件，低价冲动消费怎么测？",
    ],
    script: [
      "0-2秒：展示使用前后或防摔/挂绳演示",
      "3-7秒：展示适配机型、材质、按键孔位和手感",
      "8-13秒：做通勤、拍照、出门携带等场景演示",
      "14-18秒：说明热门机型先测，冷门机型少备",
      "结尾：评论区收集用户手机型号和想要颜色",
    ],
    imageAdvice: "需要拍机型适配、上手机效果、孔位细节和使用演示，避免只展示壳本身。",
    contentRisk: "数码周边容易受机型更新影响，备货分散会造成库存滞销，首单应控制机型数量。",
    differentiation: ["先集中热门机型，不一次性铺太多型号", "用短视频演示防摔、挂绳、支架等功能点", "评论区收集机型需求，再决定补货结构"],
    testActions: ["先测试2-3个热门机型和2个颜色", "抖音拍强演示视频，收集评论区机型需求", "把滞销机型设置为低库存观察，不盲目补齐"],
    contentWords: ["手机壳", "挂绳", "防摔", "机型", "短视频", "通勤", "个性", "抖音", "低价"],
  },
  daily_necessity: {
    label: "低价日用类",
    marketType: "低价日用 / 社群团购小商品",
    focus: ["复购", "组合销售", "走量逻辑", "低价引流", "利润薄", "社群团购", "搭售品"],
    insight: "低价日用类不适合只看单件利润，应该看复购、组合装、私域转化和走量能力。",
    cover: "低价日用不是爆款逻辑，是复购和组合销售逻辑",
    titles: (product) => [
      `${product.name || "这款日用小商品"}适合做引流品还是搭售品？`,
      "单件利润薄的小商品，靠什么赚钱？",
      "社群团购测日用品：先看复购和组合装",
      "低价日用拿货前，别只盯着毛利率",
    ],
    script: [
      "0-2秒：展示一个高频生活痛点",
      "3-7秒：演示使用前后或多场景用途",
      "8-13秒：展示组合装、家庭装或宿舍拼单方案",
      "14-18秒：说明单件利润薄，需要走量和复购",
      "结尾：引导用户评论最常用的场景",
    ],
    imageAdvice: "重点拍使用效果、组合装和真实消耗场景，视觉不强时要靠前后对比提升理解速度。",
    contentRisk: "低价日用单件利润薄，若没有复购、组合销售或私域走量，很难覆盖履约和售后成本。",
    differentiation: ["做组合装、宿舍拼单装或家庭补充装", "在私域和社群团购里验证复购，而不是只看单条内容流量", "把产品设计成搭售品，提高客单和订单稳定性"],
    testActions: ["先在校园群或社群团购测拼单价", "记录复购周期、搭售率和用户抱怨点", "用短视频演示使用效果，验证低价冲动购买"],
    contentWords: ["复购", "组合", "日用", "宿舍", "社群", "团购", "走量", "低价", "搭售"],
  },
  unknown: {
    label: "待判断品类",
    marketType: "小商品 / 待分类",
    focus: ["基础信息", "目标人群", "价格结构", "渠道测试", "竞品校准", "图片表现"],
    insight: "当前信息还不足以明确品类，建议先补充产品名称、材质、使用场景和目标渠道，再做拿货判断。",
    cover: "别让第一次进货，变成第一次压货",
    titles: (product) => [
      `逛到这款${product.name || "产品"}，我先用AI算了一遍账`,
      `${product.price || "这个价位"}元的小商品，到底值不值得进？`,
      "新手进货前一定要看这4个指标",
      "低成本测款：先发内容再决定是否补货",
    ],
    script: [
      "0-2秒：展示产品并提出痛点",
      "3-8秒：展示核心卖点和细节",
      "9-14秒：展示使用场景和价格结构",
      "15-20秒：给出是否建议拿样的结论",
      "结尾：评论区投票收集购买意愿",
    ],
    imageAdvice: "建议补充清晰产品图、使用场景图和细节图，方便判断视觉卖点。",
    contentRisk: "品类信息不足，建议先补充竞品价格、目标人群和供应商政策。",
    differentiation: ["补全产品名称、材质和使用场景", "先做同款价格搜索，避免定价脱离市场", "用小范围内容测试确定用户是否理解卖点"],
    testActions: ["补充至少3个竞品价格和2个目标渠道", "先发布1条图文和1条短视频测试卖点理解度", "保存到产品库后与明确品类产品一起PK"],
    contentWords: ["小商品", "测款", "进货", "价格", "渠道", "人群"],
  },
};

function productText(product) {
  return `${product.name || ""} ${product.category || ""} ${product.material || ""} ${product.keywords || ""} ${product.note || ""}`.toLowerCase();
}

function inferCategoryKey(product) {
  const text = productText(product);
  if (/手机壳|挂绳|支架|数码|充电|耳机|数据线|平板|防摔/.test(text)) return "phone_accessory";
  if (/发圈|发夹|发簪|头绳|鲨鱼夹|抓夹|发饰|大肠|盘发/.test(text)) return "hair_accessory";
  if (/杯|香薰|摆件|收纳|家居|桌面|宿舍好物|水杯|马克杯|镜子|抱枕|花瓶|灯/.test(text)) return "home_lifestyle";
  if (/文创|国风|笔记本|贴纸|钥匙扣|手帐|文旅|明信片|书签|城市|市集/.test(text)) return "stationery_cultural";
  if (/耳饰|耳夹|耳环|项链|戒指|手链|手串|锁骨链|珍珠|胸针|饰品|配饰/.test(text)) return "jewelry";
  if (/低价日用|日用|湿巾|纸巾|清洁|洗脸巾|抹布|去污|一次性|拖鞋|收纳袋|搭售/.test(text)) return "daily_necessity";
  return "unknown";
}

function getPriceBand(price) {
  if (!price) {
    return {
      label: "价格待补充",
      advice: "建议先补充建议售价，否则无法判断目标人群、利润空间和内容转化门槛。",
      risk: "缺少售价会让报告更偏定性判断，无法可靠测算毛利率。",
    };
  }
  if (price < 10) {
    return {
      label: "10元以下",
      advice: "适合引流和组合销售，单件利润有限，不建议单独作为主推爆品。",
      risk: "需要靠复购、搭售或批量成交覆盖履约成本。",
    };
  }
  if (price <= 30) {
    return {
      label: "10-30元",
      advice: "适合学生党、冲动消费、小红书种草和校园私域成交。",
      risk: "同质化竞争会比较明显，需要用场景图、套装或低门槛福利提高转化。",
    };
  }
  if (price <= 80) {
    return {
      label: "30-80元",
      advice: "需要强调质感、包装、礼物价值和使用场景，内容图质量会影响转化。",
      risk: "用户会开始比较质感和评价，图片、包装和信任信息要更完整。",
    };
  }
  return {
    label: "80元以上",
    advice: "需要更强信任背书、品牌感、材质证明、评价证明和高质量内容种草。",
    risk: "不适合只靠低价冲动消费，需要更完整的品牌感和售后承诺。",
  };
}

function getMoqAdvice(moq) {
  if (!moq) {
    return {
      label: "MOQ待补充",
      advice: "建议补充最小起订量，否则无法判断首批压货资金和测试风险。",
      riskLevel: "未知",
    };
  }
  if (moq <= 50) {
    return {
      label: "50件以内",
      advice: "适合拿样测试，风险较低。",
      riskLevel: "低",
    };
  }
  if (moq <= 150) {
    return {
      label: "50-150件",
      advice: "适合小批量测款，可以配合内容测试和私域反馈。",
      riskLevel: "中低",
    };
  }
  if (moq <= 300) {
    return {
      label: "150-300件",
      advice: "建议争取混批、分批拿货或降低首单量，避免压货。",
      riskLevel: "中高",
    };
  }
  return {
    label: "300件以上",
    advice: "新手压货风险较高，不建议直接下单，除非已有明确订单或渠道消化能力。",
    riskLevel: "高",
  };
}

function getChannelFit(product, categoryKey) {
  const declared = product.channel || "";
  const map = {
    jewelry: {
      best: "小红书 + 校园私域",
      avoid: "1688/批发复购作为首选渠道",
      reason: "饰品依赖佩戴图、礼物包装和精致感表达，小红书适合种草，校园私域适合低门槛礼物和熟人推荐。",
      avoidReason: "没有形成稳定复购款前，直接走批发复购容易陷入同款比价。",
    },
    hair_accessory: {
      best: "校园私域 + 摆摊/市集",
      avoid: "单纯小红书高客单打法",
      reason: "发饰低客单、轻便、现场可决策，适合宿舍群拼单、校园摊位和颜色套装销售。",
      avoidReason: "如果只靠精致图文而没有套装和上头效果，容易被同款低价替代。",
    },
    home_lifestyle: {
      best: "小红书 + 校园私域",
      avoid: "高运费条件下的摆摊/大批量发货",
      reason: "家居生活类需要场景图和生活方式表达，小红书适合种草，校园私域适合宿舍/办公室场景成交。",
      avoidReason: "体积、易碎和包装成本会拉高履约压力，不适合没验证破损率就大批量铺货。",
    },
    stationery_cultural: {
      best: "小红书 + 校园/文旅市集",
      avoid: "缺少故事表达的抖音纯低价带货",
      reason: "文创类依赖审美、主题故事和现场陈列，适合小红书种草、校园社团、市集和文旅场景。",
      avoidReason: "如果没有文化叙事和套装陈列，只打低价会削弱文创调性。",
    },
    phone_accessory: {
      best: "抖音 + 摆摊/市集",
      avoid: "一次性铺满全机型",
      reason: "数码周边适合强演示、强对比和低价冲动消费，线下也容易现场确认机型后成交。",
      avoidReason: "机型变化和款式迭代快，全机型备货容易产生滞销库存。",
    },
    daily_necessity: {
      best: "校园私域 + 社群团购 + 1688/批发复购",
      avoid: "只靠小红书精致种草",
      reason: "低价日用更看重复购买、组合装和社群成交，适合走量、拼单和搭售。",
      avoidReason: "视觉种草能力通常弱于饰品家居，单条内容爆了也未必能覆盖履约成本。",
    },
    unknown: {
      best: declared || "小红书 + 校园私域",
      avoid: "未验证前直接大批量批发复购",
      reason: "当前品类不明确，建议先用内容和小范围私域验证用户是否理解卖点。",
      avoidReason: "品类、价格和目标人群不清楚时，直接压货会放大库存风险。",
    },
  };

  const fit = map[categoryKey] || map.unknown;
  const declaredText = declared.trim();
  const normalizedDeclared = declaredText.replace(/\s/g, "");
  const bestTokens = fit.best.split(/[+\/]/).map((item) => item.trim()).filter(Boolean);
  const directMatches = bestTokens.filter((token) => normalizedDeclared.includes(token.replace(/\s/g, ""))).length;
  const hasClearChannel = /小红书|抖音|校园|私域|摆摊|市集|社群|团购|1688|批发|复购/.test(declaredText);
  const visualSeedCategory = ["jewelry", "hair_accessory", "home_lifestyle", "stationery_cultural"].includes(categoryKey);
  const onlyWholesale = /1688|批发|复购/.test(declaredText) && !/小红书|抖音|校园|私域|摆摊|市集|社群|团购/.test(declaredText);
  let score = 65;
  let scoreReason = "销售渠道填写较少，当前只能按品类默认渠道给出建议。";

  if (!declaredText) {
    score = 64;
  } else if (visualSeedCategory && onlyWholesale) {
    score = 56;
    scoreReason = "该品类更依赖视觉种草或现场试看，但当前渠道偏低价批发复购，首轮转化路径不够匹配。";
  } else if (directMatches >= 2) {
    score = 84;
    scoreReason = "填写渠道与推荐渠道高度重合，内容形式和成交场景都比较明确。";
  } else if (directMatches === 1) {
    score = 77;
    scoreReason = "填写渠道与推荐方向基本匹配，但仍需要通过图片、短视频或私域反馈验证转化效率。";
  } else if (hasClearChannel) {
    score = 68;
    scoreReason = "渠道方向可尝试，但与该品类的优先渠道不完全一致，需要先做小范围验证。";
  } else {
    score = 60;
    scoreReason = "渠道描述偏模糊，建议明确首发平台、成交方式和补货路径。";
  }

  return {
    ...fit,
    declared: declared || "未填写",
    score,
    scoreReason,
  };
}

function getCategoryNarrative(product, categoryKey) {
  const name = product.name || "该产品";
  const narratives = {
    jewelry: `饰品类产品的成交不只取决于款式好不好看，更取决于佩戴效果能否被图片快速证明。${name}如果缺少真人佩戴图，用户很难判断大小、风格和质感；如果材质说明不清楚，又容易产生过敏、掉色和廉价感疑虑。内容测款时应优先验证佩戴效果、近景做工和礼物包装是否能支撑溢价，小红书穿搭和礼物场景会比单纯白底图更适合种草。补货前建议先完成2-3套佩戴内容测试，再看收藏、询单和材质相关评论。`,
    hair_accessory: `发饰类产品单价低、决策快，适合做校园私域和短内容测款，但单件利润通常有限，不能只靠单品售卖。${name}更适合通过颜色组合、套装销售和宿舍/校园场景提升客单价；内容上要重点展示上头效果、不同发型适配和颜色矩阵，否则很容易被用户认为是普通低价发圈。首轮测款应先测试颜色偏好，再决定补哪几个色，并通过3件装、5件装或同色系组合提高客单价。`,
    home_lifestyle: `家居生活类产品的内容表现高度依赖真实使用场景和氛围感，用户需要看到它放在宿舍、办公桌或礼物场景里是否自然。${name}不能只看测算毛利率，还要核算包装、体积、易碎、运费和售后破损对真实利润的影响。内容素材要用真实环境降低退货风险，而不是只依赖精修图。`,
    stationery_cultural: `文创类产品面对的是更垂直的审美人群，成交理由通常来自故事感、文化符号和场景叙事。${name}不能只用“好看”作为卖点，需要说清楚适合手帐、校园、市集、文旅或送礼的具体场景。复购可能弱于日用品，因此更适合通过系列化、收藏属性和主题限定提升购买理由。`,
    phone_accessory: `手机周边类产品要优先控制机型适配和库存风险，热门款生命周期短，适合小批量快测快补。${name}需要把上机效果、孔位、按键、边框厚度和功能演示拍清楚，否则售后问题会集中在“不适配”“手感差”“孔位偏”。内容上适合短视频做强演示和个性化表达，库存上不要一次性铺满全机型。`,
    daily_necessity: `低价日用类产品不能只看单次毛利，真正的逻辑是复购、组合、走量和私域转化。${name}更适合作为引流品、搭售品或社群团购品，通过组合装、囤货装和使用前后对比提高转化。首轮测款应重点看真实复购、搭售率和群内成交效率，而不是只看一条内容的曝光。`,
    unknown: `当前信息还不足以稳定判断品类，建议先补充产品名称、材质、使用场景、竞品价格和目标渠道。只有明确品类后，才能进一步判断内容素材、渠道匹配和压货风险。`,
  };
  return narratives[categoryKey] || narratives.unknown;
}

function getImageContentPlan(categoryKey, channelFit) {
  const plans = {
    jewelry: {
      mustShoot: ["真人佩戴图：正脸、侧脸、近距离耳部或颈部效果", "近景细节图：材质、珍珠、金属光泽、接口和做工", "尺寸参照图：和手指、耳朵、硬币或掌心对比", "包装图：礼盒、卡纸、袋子，突出礼物属性"],
      bonusShots: ["通勤、约会、校园、春夏穿搭场景图", "同款不同穿搭风格对比", "佩戴前后精致感对比"],
      missingRisk: "不要只放白底图，否则用户无法判断佩戴效果、大小和真实质感。",
      coverAdvice: "首图建议用真人佩戴特写，3秒内让用户看出风格、大小和精致感。",
      channelFocus: {
        xhs: "小红书重点做穿搭、礼物、氛围感和标题种草。",
        douyin: "抖音重点拍佩戴前后对比、开箱和光泽细节。",
        private: "校园私域重点用实拍、价格、礼盒款和同学试戴降低决策成本。",
        market: "摆摊/市集重点展示远看吸引的陈列和近看有质感的细节。",
      },
    },
    hair_accessory: {
      mustShoot: ["上头效果图：扎发、半扎、丸子头和低马尾", "颜色矩阵图：多个颜色并排展示，方便选色", "套装组合图：3件装、5件装、同色系组合", "宿舍/校园场景图：镜子前、课桌旁、通勤包搭配", "材质细节图：布料纹理、弹力、缝线和厚度"],
      bonusShots: ["普通发圈 vs 该款上头效果对比", "不同发量试戴效果", "校园群颜色投票截图风格素材"],
      missingRisk: "不要只拍单个平铺图，否则看不出体积、佩戴氛围和颜色组合价值。",
      coverAdvice: "首图建议用上头效果 + 颜色矩阵，直接展示“好看、好选、适合宿舍拼单”。",
      channelFocus: {
        xhs: "小红书重点拍宿舍好物、显发量、颜色组合和套装种草。",
        douyin: "抖音前3秒展示普通头绳和上头效果对比。",
        private: "校园私域重点用实拍、套装价、颜色投票和宿舍拼单。",
        market: "摆摊/市集重点做颜色矩阵、套装陈列和现场试戴。",
      },
    },
    home_lifestyle: {
      mustShoot: ["真实使用场景图：宿舍、办公桌、床头、书桌或厨房", "氛围图：灯光、桌搭、生活方式感", "尺寸参照图：和手机、书本、杯子或手掌对比", "包装保护图：是否防摔、防碎、包装是否稳", "细节图：材质、纹理、容量、开口和边角"],
      bonusShots: ["易碎品包装厚度和保护方式", "使用前后环境变化", "礼物开箱场景"],
      missingRisk: "不要只放精修图，要补真实场景图和包装保护图，降低退货和破损风险。",
      coverAdvice: "首图建议用真实桌面/宿舍氛围图，让用户快速看到使用后的生活方式变化。",
      channelFocus: {
        xhs: "小红书重点做生活方式、桌搭、宿舍改造和氛围感。",
        douyin: "抖音重点拍开箱、使用过程和前后空间变化。",
        private: "校园私域重点说清楚尺寸、价格、运费和宿舍适配。",
        market: "摆摊/市集重点展示现场陈列、触感细节和包装保护。",
      },
    },
    stationery_cultural: {
      mustShoot: ["主题故事图：国风、校园、城市、节日或文旅元素", "使用场景图：书桌、手帐、钥匙包、帆布袋、笔记本", "系列化展示图：同系列不同款并排，提升收藏感", "细节图：印刷、纹理、挂件、边缘和材质", "市集/摊位图：展示线下售卖氛围"],
      bonusShots: ["包装、卡片、礼袋等送礼图", "主题故事卡", "用户自定义搭配图"],
      missingRisk: "不要只拍单品，要讲清楚文化符号、系列主题和使用场景。",
      coverAdvice: "首图建议用系列化陈列 + 主题故事，让用户看见收藏理由。",
      channelFocus: {
        xhs: "小红书重点讲审美、故事感、手帐和送礼。",
        douyin: "抖音重点做开箱、系列展示和用途切换。",
        private: "校园私域重点结合社团、节日和同学送礼场景。",
        market: "摆摊/市集重点做系列化陈列、主题牌和现场氛围。",
      },
    },
    phone_accessory: {
      mustShoot: ["机型适配图：明确适配机型", "上机效果图：手机壳、支架或挂绳装上后的效果", "功能演示图：防摔、支架角度、挂绳承重、镜头保护", "细节图：孔位、按键、边框、材质和厚度", "对比图：裸机 vs 使用后效果"],
      bonusShots: ["短视频封面图：突出个性化、好看、实用", "不同机型/颜色组合", "通勤、拍照、出门携带场景"],
      missingRisk: "不要缺少机型适配说明，否则容易产生售后和退换货。",
      coverAdvice: "首图建议把机型、上机效果和核心功能放在一起，快速证明适配和实用。",
      channelFocus: {
        xhs: "小红书重点拍个性表达、穿搭配色和上机美观。",
        douyin: "抖音前3秒展示防摔、挂绳、支架角度等强演示。",
        private: "校园私域重点标清机型、价格和可选颜色。",
        market: "摆摊/市集重点按机型分类陈列，方便现场决策。",
      },
    },
    daily_necessity: {
      mustShoot: ["使用前后对比图", "一图看懂功能图", "多件组合图", "家庭/宿舍/办公场景图", "尺寸和容量说明图"],
      bonusShots: ["批量囤货图或组合装图", "使用步骤分解图", "搭售组合图"],
      missingRisk: "不要只拍产品本身，要强调使用价值、性价比和解决了什么具体问题。",
      coverAdvice: "首图建议用前后对比或功能结果图，让用户立刻看懂为什么需要它。",
      channelFocus: {
        xhs: "小红书重点拍真实使用场景、收纳清洁结果和性价比。",
        douyin: "抖音前3秒展示使用前后差异和功能结果。",
        private: "校园私域重点突出组合优惠、团购价和复购场景。",
        market: "摆摊/市集重点展示组合装、囤货量和现场试用。",
      },
    },
    unknown: {
      mustShoot: ["清晰产品图", "使用场景图", "尺寸参照图", "细节图"],
      bonusShots: ["竞品对比图", "包装图", "用户使用过程图"],
      missingRisk: "不要只靠文字描述，至少补齐产品、场景和尺寸信息。",
      coverAdvice: "首图先让用户看懂产品是什么、解决什么问题、适合谁。",
      channelFocus: {
        xhs: "小红书重点补场景和标题种草感。",
        douyin: "抖音重点补使用演示和前后对比。",
        private: "校园私域重点补实拍、价格和购买理由。",
        market: "摆摊/市集重点补陈列和现场试用。",
      },
    },
  };
  const plan = plans[categoryKey] || plans.unknown;
  const best = channelFit?.best || "";
  const preferredFocus = [
    best.includes("小红书") ? plan.channelFocus.xhs : "",
    best.includes("抖音") ? plan.channelFocus.douyin : "",
    best.includes("校园") || best.includes("私域") || best.includes("社群") ? plan.channelFocus.private : "",
    best.includes("摆摊") || best.includes("市集") ? plan.channelFocus.market : "",
  ].filter(Boolean);
  return {
    ...plan,
    preferredFocus: preferredFocus.length ? preferredFocus : Object.values(plan.channelFocus).slice(0, 2),
  };
}

function getSamplingStrategy({ categoryKey, priceBand, moqAdvice, channelFit, status }) {
  const strategies = {
    jewelry: ["验证佩戴效果是否能明显提升精致感", "检查材质质感、掉色和过敏反馈", "测试包装是否能支撑礼物溢价", "用小红书穿搭/礼物内容判断询单质量"],
    hair_accessory: ["先测颜色偏好，决定首批补哪几个色", "验证上头效果和不同发型适配", "测试3件装/5件装能否提升客单价", "在宿舍/校园场景里观察拼单意愿"],
    home_lifestyle: ["验证真实使用场景是否有氛围感", "核算包装保护、破损和运费影响", "观察宿舍/办公室/礼物场景哪一个更容易成交", "先测小批量履约再考虑补货"],
    stationery_cultural: ["验证文化符号和主题故事是否被用户理解", "测试系列化展示是否提升收藏感", "观察校园/市集/文旅场景的停留和询价", "用小批量主题款判断后续开发方向"],
    phone_accessory: ["先限定热门机型测试，不铺满全型号", "验证孔位、按键、边框和上机效果", "通过短视频收集用户机型和颜色需求", "根据评论区机型需求决定补货结构"],
    daily_necessity: ["验证复购和组合装转化，不只看单件毛利", "测试社群团购和搭售场景", "观察使用前后对比是否能促成下单", "控制履约成本，优先做走量小单"],
    unknown: ["先补齐品类、价格、渠道和竞品信息", "用小范围内容测试验证卖点是否被理解", "不要在信息不清楚时放大首单量"],
  };
  return {
    headline: status === "暂不考虑" ? "先降风险，再判断是否拿样" : status === "建议补货" ? "可以进入补货观察，但先复核验证点" : "适合用小批量完成关键验证",
    context: `${priceBand.label} · ${moqAdvice.label} · ${channelFit.best}`,
    checkpoints: strategies[categoryKey] || strategies.unknown,
  };
}

function getTestDecisionStandards(categoryKey) {
  const categoryNote = {
    jewelry: "饰品类还要重点观察用户是否追问材质、是否过敏、是否有礼盒和佩戴尺寸。",
    hair_accessory: "发饰类要额外记录用户偏好的颜色、套装数量和上头效果反馈，颜色投票比单条点赞更有参考价值。",
    home_lifestyle: "家居生活类要同时记录用户对尺寸、运费、破损和真实场景的疑问，不能只看氛围图互动。",
    stationery_cultural: "文创类要关注用户是否理解主题故事，是否愿意为了系列化、限定款或送礼场景付费。",
    phone_accessory: "手机周边类要把询单机型单独统计，避免内容热度高但实际可售机型不匹配。",
    daily_necessity: "低价日用类要看复购意愿、组合装接受度和社群团购转化，而不是只看单条内容曝光。",
    unknown: "品类不明确时，先看用户是否能快速理解产品用途和价格，再决定是否继续补充信息。",
  };

  return [
    "收藏率高于5%：说明款式、场景或使用结果有种草潜力，可以继续观察评论和询单。",
    "询单率高于1.5%：说明价格、场景或产品卖点已经产生初步购买吸引力。",
    "24-72小时内有连续询单：可以考虑进入小批量补货观察，但仍不建议直接大批量压货。",
    "只有点赞没有询单：说明内容有吸引力但购买理由不够强，优先优化价格、包装、材质说明和信任信息。",
    "收藏高但评论弱：说明用户有兴趣但决策不急，可以补充实拍、价格说明或组合优惠后再测一次。",
    "材质、过敏、掉色、破损、尺寸等负面反馈明显：暂停补货，优先重新核验样品质量和供应商售后。",
    "成交转化稳定且测款成本可控：可以考虑小批量补货，而不是一次性大批量进货。",
    categoryNote[categoryKey] || categoryNote.unknown,
  ];
}

function getSupplierQuestions(categoryKey) {
  const questions = {
    jewelry: [
      "是否支持1-3件拿样？样品和大货是否一致？",
      "MOQ是否可以混批颜色、款式或套装？",
      "是否支持7天内补货？热卖款断货周期通常多久？",
      "是否可以提供材质说明、防过敏说明或检测信息？",
      "包装是否包含礼盒、卡纸或袋子？包装成本如何计算？",
      "掉色、断裂、过敏等售后如何处理？",
    ],
    hair_accessory: [
      "是否支持颜色混批？热卖颜色是否稳定有货？",
      "套装组合是否可以自选颜色？3件装和5件装价格如何算？",
      "弹力、缝线、面料厚度是否有实拍细节或样品图？",
      "是否支持低MOQ补货？补货周期通常多久？",
      "是否容易变形、掉毛或脱线？售后规则是什么？",
      "能否提供颜色矩阵图和上头效果图供测款使用？",
    ],
    home_lifestyle: [
      "包装是否防摔防碎？是否有包装保护实拍图？",
      "运费和体积重如何计算？不同地区是否有加价？",
      "破损售后如何处理？是否包赔或补发？",
      "是否支持一件拿样？样品和大货是否一致？",
      "是否有真实场景图或买家秀可供参考？",
      "批量发货时包装、标签和质检是否稳定？",
    ],
    stationery_cultural: [
      "是否支持小批量定制？最低定制量是多少？",
      "图案版权和授权是否清楚？能否提供授权说明？",
      "是否可以做系列化组合或节日限定套装？",
      "包装、卡片和礼袋是否支持定制？费用如何计算？",
      "节日款或文旅款是否有稳定补货周期？",
      "印刷色差、材质误差和瑕疵品如何处理？",
    ],
    phone_accessory: [
      "当前适配哪些具体机型？热门机型库存分别有多少？",
      "孔位、按键、镜头保护和边框厚度是否准确？",
      "是否支持不同机型混批？每个机型最低起订量是多少？",
      "热门机型是否容易断货？补货周期通常多久？",
      "防摔、支架、挂绳等功能是否有测试说明或视频？",
      "不适配、孔位偏差和功能问题的售后退换如何处理？",
    ],
    daily_necessity: [
      "是否支持组合装或批量折扣？不同数量阶梯价是多少？",
      "是否有稳定库存和补货周期？大促期间是否容易断货？",
      "单件包装成本是多少？是否适合快递和批量发货？",
      "是否适合社群团购或批量发货？是否可做团购包装？",
      "是否有尺寸、容量、材质等清晰参数和检测说明？",
      "退换货、破损和漏发处理规则是什么？",
    ],
    unknown: [
      "是否支持低数量拿样？样品和大货是否一致？",
      "MOQ、混批、补货周期和阶梯价分别是多少？",
      "是否有真实图片、买家秀或使用视频？",
      "包装、物流和售后规则如何处理？",
    ],
  };

  return questions[categoryKey] || questions.unknown;
}

function inferMarketInfo(product) {
  const categoryKey = inferCategoryKey(product);
  const template = categoryTemplates[categoryKey] || categoryTemplates.unknown;

  return {
    categoryKey,
    categoryName: template.label,
    marketType: product.category || template.marketType,
    categoryFocus: template.focus,
    categoryInsight: template.insight,
    cover: template.cover,
    xhsTitles: template.titles(product),
    douyinScript: template.script,
    imageAdvice: template.imageAdvice,
    contentRisk: template.contentRisk,
    differentiation: template.differentiation,
    testActions: template.testActions,
    contentWords: template.contentWords,
  };
}

function analyzeProduct(product, hasImage) {
  const market = inferMarketInfo(product);
  const categoryKey = market.categoryKey;
  const channelFit = getChannelFit(product, categoryKey);
  const imagePlan = getImageContentPlan(categoryKey, channelFit);
  const cost = n(product.cost);
  const price = n(product.price);
  const moq = n(product.moq);
  const priceBand = getPriceBand(price);
  const moqAdvice = getMoqAdvice(moq);

  const categoryPackaging = {
    jewelry: /礼盒|包装|礼物/.test(`${product.supplier} ${product.note}`) ? 1.8 : 1.1,
    hair_accessory: 0.6,
    home_lifestyle: /易碎|玻璃|陶瓷|杯/.test(`${product.material} ${product.logistics}`) ? 4.2 : 2.5,
    stationery_cultural: 0.8,
    phone_accessory: 0.9,
    daily_necessity: 0.45,
    unknown: 0.8,
  };

  const categoryLogistics = {
    jewelry: 1.2,
    hair_accessory: 0.9,
    home_lifestyle: /易碎|玻璃|陶瓷|杯/.test(`${product.material} ${product.logistics}`) ? 5.5 : 3.2,
    stationery_cultural: 0.9,
    phone_accessory: 1.1,
    daily_necessity: 0.8,
    unknown: 1.2,
  };

  const packaging = categoryPackaging[categoryKey] ?? 0.8;
  const logisticsCost = categoryLogistics[categoryKey] ?? 1.2;
  const platformFee = price * 0.05;
  const unitCost = cost + packaging + logisticsCost + platformFee;
  const profit = price - unitCost;
  const margin = price > 0 ? profit / price : 0;
  const stockCost = cost * moq;

  const text = `${product.name} ${product.category} ${product.material} ${product.audience} ${product.channel} ${product.keywords} ${product.note}`;
  const hotWords = ["小红书", "抖音", "学生", "礼物", "拍照", "出片", "通勤", "校园", "宿舍", "私域", "市集", ...market.contentWords];
  const hotScore = hotWords.filter((word) => text.includes(word)).length * 4;
  const declaredChannelFit = channelFit.declared !== "未填写" && channelFit.best.split(/[+ /]/).some((item) => item && channelFit.declared.includes(item.trim()));
  const channelScore = channelFit.score;
  const categoryRiskPenalty =
    (categoryKey === "home_lifestyle" && /易碎|玻璃|陶瓷/.test(`${product.material} ${product.logistics}`) ? 10 : 0) +
    (categoryKey === "phone_accessory" && moq > 200 ? 12 : 0) +
    (categoryKey === "daily_necessity" && margin < 0.45 ? 8 : 0) +
    (categoryKey === "jewelry" && !/925|银|钛钢|合金|珍珠|材质/.test(`${product.material} ${product.note}`) ? 6 : 0);

  const profitScore = clamp(margin * 145, 30, 96);
  const contentScore = clamp(48 + hotScore + (hasImage ? 9 : 0) + (declaredChannelFit ? 7 : 0), 38, 96);
  const supplyScore = clamp(92 - (moq > 300 ? 28 : moq > 150 ? 18 : moq > 80 ? 10 : 2) + ((product.supplier || "").includes("补货") ? 6 : 0), 35, 95);
  const riskScore = clamp(82 - (product.competitorPrice ? 0 : 8) - categoryRiskPenalty - (moq > 300 ? 10 : 0), 35, 92);
  const infoScore = clamp(45 + [product.name, product.category, product.cost, product.price, product.moq, product.audience, product.channel, product.supplier].filter(Boolean).length * 6 + (hasImage ? 7 : 0), 35, 98);

  const totalScore = Math.round(
    profitScore * 0.24 +
      channelScore * 0.18 +
      contentScore * 0.22 +
      supplyScore * 0.14 +
      riskScore * 0.12 +
      infoScore * 0.1
  );

  let level = "建议小批量测款";
  let status = "正在测款";
  if (totalScore >= 82 && margin >= 0.35 && stockCost <= 1800 && moq <= 150) {
    level = "推荐拿样并快速测款";
    status = "准备拿样";
  }
  if (totalScore >= 88 && margin >= 0.45 && (product.supplier || "").includes("补货") && moq <= 150) {
    level = "高潜力，建议进入补货观察";
    status = "建议补货";
  }
  if (totalScore < 65 || margin < 0.22 || stockCost > 3000 || (moq > 300 && totalScore < 82)) {
    level = "暂不建议直接进货";
    status = "暂不考虑";
  }

  const visualEvidenceNote = hasImage
    ? "已基于上传图片完成初步判断，但仍建议补充更完整的实拍素材，例如佩戴图、细节图、尺寸参照图或包装图，以提升测款准确性。"
    : "暂未上传产品图片，当前视觉判断主要基于文字信息。建议补充实拍图后，再校准封面吸引力、细节质感和内容测款判断。";

  let risks = [];
  if (margin < 0.35) risks.push("毛利率偏低，后续广告、退换货和包装成本会挤压利润。建议重新核算售价或寻找更低拿货价。");
  if (moq > 150) risks.push(`MOQ处于${moqAdvice.label}，${moqAdvice.advice}`);
  if (!(product.supplier || "").includes("补货")) risks.push("供应商补货周期不明确，爆单后可能出现断货风险。");
  if (!product.competitorPrice) risks.push("缺少同类竞品价格，建议补充1688/淘宝/小红书同款价格区间。");
  risks.push(market.contentRisk);
  if (risks.length === 0) risks.push("基础风险较可控，但仍需核实样品与大货一致性、质检信息和售后条款。");
  risks = risks.slice(0, 3);

  const nextTestActions = [
    ...market.testActions,
    "收集收藏、评论、询单和私信数据，至少观察24-72小时。",
    "把测款数据回填到测款复盘，再决定补货、改图、降价或停测。",
  ];

  const actions = [
    "先拿样或小批量进货，不建议直接大批量压货。",
    "用小红书/抖音发布2-3条测款内容，观察收藏率、评论询单率、私信咨询量。",
    "用校园群、朋友圈或私域做小范围成交验证，记录真实转化。",
    "如果互动率和询单率较好，再和供应商谈补货周期、混批政策和包装定制。",
    "复盘每款产品的数据，把评分、利润、内容表现和销量记录到产品库。",
  ];

  const xhsStructure = [
    "封面提出痛点或结果，例如“这个货值不值得进？”",
    `展示${market.categoryName}的关键画面：${market.categoryFocus.slice(0, 3).join("、")}。`,
    "讲价格结构：拿货价、建议售价、预计利润。",
    "讲适合人群和真实使用场景。",
    `讲风险点：${market.categoryFocus.slice(-3).join("、")}。`,
    "给出是否建议拿样/测款的结论。",
    "发起互动投票：你会买吗？哪个颜色/款式更好？",
    "引导收藏或评论，收集市场反馈。",
  ];

  const fitReasons = [
    margin >= 0.35 ? `毛利率约${Math.round(margin * 100)}%，有一定空间覆盖包装、物流和平台费用。` : "毛利率偏低，暂时不适合作为高投入主推款。",
    stockCost <= 1800 ? `首批压货约¥${money(stockCost)}，仍处在可小批量测试范围。` : `首批压货约¥${money(stockCost)}，对新手压力偏高。`,
    `渠道验证路径相对清楚，可优先围绕${channelFit.best}做首轮反馈收集。`,
    `当前信息足以形成一轮最小测试，但补货前仍需要看真实询单和成交数据。`,
  ];

  const unfitReasons = [
    moq > 150 ? `MOQ风险偏高：${moqAdvice.advice}` : "若供应商不能提供样品或混批，仍要重新评估首单风险。",
    `${market.categoryName}常见风险：${market.contentRisk}`,
    `暂不建议渠道：${channelFit.avoid}。${channelFit.avoidReason}`,
  ];

  const samplingStrategy = getSamplingStrategy({ categoryKey, priceBand, moqAdvice, channelFit, status });
  const testStandards = getTestDecisionStandards(categoryKey);
  const supplierQuestions = getSupplierQuestions(categoryKey);
  const biggestRisk = risks.find((risk) => !risk.includes("暂未上传产品图片")) || risks[0] || market.contentRisk;
  const executiveSummary = [
    status === "暂不考虑" ? "暂不建议直接下单，先降低首单量或补充关键信息。" : status === "建议补货" ? "可以进入补货观察，但仍需用真实测款数据复核。" : "建议先拿样或小批量测款，不建议直接大批量压货。",
    `核心理由：${priceBand.label}的售价区间与${channelFit.best}较匹配，首批压货约¥${money(stockCost)}。`,
    `最大风险：${biggestRisk}`,
    "下一步：完成一轮最小内容测试，并把反馈回填到测款复盘。",
  ];

  const explanations = [
    ["利润与价格带", Math.round(profitScore), `${priceBand.label}：${priceBand.advice} 当前预估毛利率约${Math.round(margin * 100)}%。`],
    [`${market.categoryName}内容潜力`, Math.round(contentScore), hasImage ? "已有图片输入，可进一步判断封面吸引力、细节完整度和内容素材丰富度。" : "暂缺图片输入，内容潜力主要来自文本信息，建议补图后再校准判断。"],
    ["渠道适配", Math.round(channelScore), `最适合渠道：${channelFit.best}。${channelFit.reason} 评分原因：${channelFit.scoreReason}`],
    ["MOQ与供应", Math.round(supplyScore), `${moqAdvice.label}：${moqAdvice.advice} ${(product.supplier || "").includes("补货") ? "供应商补货信息较清楚。" : "还需要确认补货周期和混批政策。"}`],
    ["风险控制", Math.round(riskScore), `${market.categoryName}需重点关注：${market.categoryFocus.slice(-3).join("、")}。${product.competitorPrice ? "已有竞品价格区间，可辅助校准定价。" : "仍缺少竞品价格校准。"}`],
    ["信息完整", Math.round(infoScore), infoScore >= 80 ? "产品基础信息较完整，报告可信度较高。" : "信息仍不完整，建议补充人群、渠道、供应商和物流风险。"],
  ];

  const report = `【TradePilot AI 进货决策报告】

一、产品基础信息
产品名称：${product.name || "未填写"}
产品类型：${product.category || market.marketType || "未填写"}
拿货价：${product.cost || "未填写"} 元
建议售价：${product.price || "未填写"} 元
MOQ：${product.moq || "未填写"} 件
材质：${product.material || "未填写"}
目标人群：${product.audience || "未填写"}
销售渠道：${product.channel || "未填写"}
竞品价格：${product.competitorPrice || "未填写"}
供应商信息：${product.supplier || "未填写"}

二、AI综合判断
综合评分：${totalScore}/100
状态：${status}
决策建议：${level}
执行摘要：
${executiveSummary.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}

三、利润测算
单件综合成本：${money(unitCost)} 元
预估单件利润：${money(profit)} 元
预估毛利率：${Math.round(margin * 100)}%
首批压货资金：${money(stockCost)} 元
说明：测算默认平台费率5%，实际经营时需根据渠道重新校正。

四、品类判断
识别品类：${market.categoryName}（${categoryKey}）
品类逻辑：${getCategoryNarrative(product, categoryKey)}

五、渠道适配建议
最适合渠道：${channelFit.best}
适合理由：${channelFit.reason}
渠道适配评分：${Math.round(channelScore)}/100
评分说明：${channelFit.scoreReason}
暂不建议渠道：${channelFit.avoid}
不建议理由：${channelFit.avoidReason}
当前填写渠道：${channelFit.declared}

六、价格带与 MOQ 判断
价格带：${priceBand.label}
价格判断：${priceBand.advice}
价格风险：${priceBand.risk}
MOQ区间：${moqAdvice.label}
MOQ风险等级：${moqAdvice.riskLevel}
MOQ建议：${moqAdvice.advice}

七、图片与内容素材建议
视觉判断状态：${visualEvidenceNote}
必拍图片：
${imagePlan.mustShoot.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}
加分图片：
${imagePlan.bonusShots.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}
不建议缺失的图片：${imagePlan.missingRisk}
首图/封面建议：${imagePlan.coverAdvice}
渠道拍摄重点：
${imagePlan.preferredFocus.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}

八、测款判断标准
${testStandards.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}

九、供应商沟通清单
${supplierQuestions.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}

十、产品差异化建议
${market.differentiation.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}

十一、风险备忘
${risks.map((risk, index) => `${index + 1}. ${risk}`).join(String.fromCharCode(10))}

十二、小红书内容包
封面文案：${market.cover}
标题建议：
${market.xhsTitles.map((title, index) => `${index + 1}. ${title}`).join(String.fromCharCode(10))}
图文结构：
${xhsStructure.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}
推荐标签：#进货测款 #小商品创业 #选品笔记 #小红书开店 #低成本创业

十三、抖音短视频脚本
${market.douyinScript.map((shot, index) => `${index + 1}. ${shot}`).join(String.fromCharCode(10))}

十四、下一步执行动作
拿样验证重点：${samplingStrategy.headline}
验证背景：${samplingStrategy.context}
${samplingStrategy.checkpoints.map((action, index) => `${index + 1}. ${action}`).join(String.fromCharCode(10))}
${nextTestActions.slice(-2).map((action, index) => `${samplingStrategy.checkpoints.length + index + 1}. ${action}`).join(String.fromCharCode(10))}

十五、AI评分依据
${explanations.map(([label, score, reason], index) => `${index + 1}. ${label}：${score}分。${reason}`).join(String.fromCharCode(10))}`;

  return {
    market,
    categoryKey,
    categoryName: market.categoryName,
    channelFit,
    imagePlan,
    samplingStrategy,
    priceBand,
    moqAdvice,
    unitCost,
    profit,
    margin,
    stockCost,
    totalScore,
    level,
    status,
    risks,
    actions,
    nextTestActions,
    executiveSummary,
    fitReasons,
    unfitReasons,
    explanations,
    xhsStructure,
    report,
    contentPotentialScore: Math.round(contentScore),
    scores: [
      ["利润与价格带", Math.round(profitScore)],
      ["渠道适配", Math.round(channelScore)],
      [`${market.categoryName}内容`, Math.round(contentScore)],
      ["MOQ供应", Math.round(supplyScore)],
      ["风险控制", Math.round(riskScore)],
      ["信息完整", Math.round(infoScore)],
    ],
  };
}

function getRecordStatus(record) {
  return record?.result?.status || record?.result?.level || record?.advice || (record?.score >= 85 ? "准备拿样" : record?.score >= 70 ? "正在测款" : "暂不考虑");
}

function getRecordMetrics(record) {
  const fallback = record?.product ? analyzeProduct(record.product, Boolean(record.product.imagePreview)) : null;
  const result = record?.result || {};
  return {
    score: Number(record?.score ?? result.totalScore ?? fallback?.totalScore ?? 0) || 0,
    status: getRecordStatus(record),
    margin: Number(result.margin ?? fallback?.margin ?? 0) || 0,
    stockCost: Number(result.stockCost ?? fallback?.stockCost ?? 0) || 0,
    riskCount: Array.isArray(result.risks) ? result.risks.length : fallback?.risks?.length || 0,
    contentPotential: Number(result.contentPotentialScore ?? fallback?.contentPotentialScore ?? 0) || 0,
    channelFit: result.channelFit?.best || fallback?.channelFit?.best || "待补充渠道",
    categoryName: result.categoryName || fallback?.categoryName || record?.category || "未分类",
  };
}

function getPkRecommendation(left, right) {
  if (!left || !right) return "请选择两个产品后生成优先级建议。";
  const leftMetrics = getRecordMetrics(left);
  const rightMetrics = getRecordMetrics(right);
  const leftIndex = leftMetrics.score + leftMetrics.contentPotential * 0.25 + leftMetrics.margin * 35 - leftMetrics.riskCount * 3 - (leftMetrics.stockCost > 2500 ? 8 : 0);
  const rightIndex = rightMetrics.score + rightMetrics.contentPotential * 0.25 + rightMetrics.margin * 35 - rightMetrics.riskCount * 3 - (rightMetrics.stockCost > 2500 ? 8 : 0);
  const winner = leftIndex >= rightIndex ? left : right;
  const winnerMetrics = leftIndex >= rightIndex ? leftMetrics : rightMetrics;
  const action = winnerMetrics.status === "建议补货" ? "优先进入补货观察" : winnerMetrics.status === "准备拿样" ? "优先拿样" : "优先测款";
  return `${winner.product_name || "候选产品"}更适合${action}，原因是评分、内容潜力和渠道适配综合更稳，同时当前风险数量为${winnerMetrics.riskCount}个。`;
}

function App() {
  const [page, setPage] = useState("cover");
  const [mode, setMode] = useState("intro");
  const [product, setProduct] = useState(blankProduct);
  const [image, setImage] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("全部");
  const [historySort, setHistorySort] = useState("saved_desc");
  const [pkLeftId, setPkLeftId] = useState("");
  const [pkRightId, setPkRightId] = useState("");
  const [review, setReview] = useState({
    views: "",
    likes: "",
    saves: "",
    comments: "",
    inquiries: "",
    orders: "",
    cost: "",
  });

  const result = useMemo(() => analyzeProduct(product, Boolean(image)), [product, image]);

  function update(key, value) {
    setProduct((old) => ({ ...old, [key]: value }));
    setAnalyzed(false);
    setSaveMessage("");
  }

  function copyReport() {
    navigator.clipboard?.writeText(result.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function downloadReport() {
    const blob = new Blob([result.report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${product.name || "进货报告"}-TradePilot.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function saveCurrentReport() {
    try {
      setSaveMessage("正在保存到我的产品库...");

      const smallImage = image && image.length < 180000 ? image : "";

      const localRecord = {
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
        product_name: product?.name || "未命名产品",
        category: product?.category || "未分类",
        score: Number(result?.totalScore ?? 0) || 0,
        advice: result?.level || "暂无建议",
        price: product?.price || "",
        competitor_price: product?.competitorPrice || "",
        product: {
          ...product,
          imagePreview: smallImage,
        },
        result: {
          status: result?.status || "",
          totalScore: result?.totalScore ?? 0,
          level: result?.level || "",
          risks: result?.risks || [],
          scores: result?.scores || [],
          explanations: result?.explanations || [],
          margin: result?.margin ?? 0,
          stockCost: result?.stockCost ?? 0,
          contentPotentialScore: result?.contentPotentialScore ?? 0,
          channelFit: result?.channelFit || null,
          categoryName: result?.categoryName || "",
          review,
        },
        report: result?.report || "暂无报告内容",
      };

      const oldRecords = JSON.parse(
        localStorage.getItem("tradepilot_local_records") || "[]"
      );

      const nextRecords = [localRecord, ...oldRecords].slice(0, 50);

      localStorage.setItem(
        "tradepilot_local_records",
        JSON.stringify(nextRecords)
      );

      setHistoryRecords(nextRecords);
      setSaveMessage("已保存到我的产品库 ✓（游客演示模式，本地保存）");
    } catch (error) {
      setSaveMessage("保存失败：" + error.message);
    }
  }

  async function loadHistoryRecords() {
    try {
      setHistoryLoading(true);
      setHistoryMessage("");

      const localRecords = JSON.parse(
        localStorage.getItem("tradepilot_local_records") || "[]"
      );

      setHistoryRecords(localRecords);

      if (localRecords.length === 0) {
        setHistoryMessage("当前为游客演示模式，保存的产品会记录在本浏览器中。");
      }
    } catch (error) {
      setHistoryMessage("读取产品库失败：" + error.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deleteHistoryRecord(id) {
    const ok = window.confirm("确定删除这条产品记录吗？");
    if (!ok) return;

    const oldRecords = JSON.parse(
      localStorage.getItem("tradepilot_local_records") || "[]"
    );

    const nextRecords = oldRecords.filter((record) => record.id !== id);

    localStorage.setItem(
      "tradepilot_local_records",
      JSON.stringify(nextRecords)
    );

    setHistoryRecords(nextRecords);
  }

  async function analyzeImageWithAI() {
    if (!image) {
      alert("请先上传产品图片");
      return;
    }

    setAiLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, 55000);

    const pickText = (...values) => {
      const found = values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
      return found ? String(found).trim() : "";
    };

    const pickNumber = (...values) => {
      const raw = pickText(...values);
      const match = String(raw).match(/\d+(\.\d+)?/);
      return match ? match[0] : "";
    };

    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          image,
          hint:
            "请只根据上传图片识别产品。不要沿用页面旧字段。先判断这是项链/耳饰/发饰/其他，若看到一整圈珍珠串、扣头、延长链或包装盒内圆形珠链，优先判断为珍珠项链/锁骨链，不要判断为耳夹。",
        }),
      });

      clearTimeout(timer);

      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error("接口返回不是 JSON：", text);
        alert("AI识别失败：接口返回格式异常。请稍后重试，或先手动填写产品信息生成报告。");
        return;
      }

      if (!response.ok) {
        console.error("AI识别接口错误：", data);
        alert(data.error || data.message || "AI识别失败，请检查模型权限或稍后重试。");
        return;
      }

      const aiProduct = data?.product || {};

      setAiInsight(data);

      setProduct((old) => ({
        ...old,
        name: pickText(aiProduct.name, aiProduct.productName, old.name),
        category: pickText(aiProduct.category, aiProduct.type, old.category),
        material: pickText(aiProduct.material, old.material),
        cost: pickNumber(aiProduct.cost, aiProduct.purchasePrice, aiProduct.sourcePrice, aiProduct.wholesalePrice, old.cost),
        price: pickText(aiProduct.price, aiProduct.suggestedPrice, aiProduct.sellingPrice, old.price),
        moq: pickNumber(aiProduct.moq, aiProduct.MOQ, aiProduct.minimumOrderQuantity, old.moq),
        audience: pickText(aiProduct.audience, aiProduct.targetAudience, old.audience),
        channel: pickText(aiProduct.channel, aiProduct.salesChannel, old.channel),
        supplier: pickText(aiProduct.supplier, aiProduct.supplierInfo, old.supplier),
        competitorPrice: pickText(aiProduct.competitorPrice, aiProduct.competitor_price, old.competitorPrice),
        logistics: pickText(aiProduct.logistics, aiProduct.packageRisk, old.logistics),
        keywords: pickText(aiProduct.keywords, aiProduct.tags, old.keywords),
        note: pickText(aiProduct.note, aiProduct.description, old.note),
      }));

      setAnalyzed(false);
      alert("AI识别完成，已自动回填产品信息");
    } catch (error) {
      clearTimeout(timer);

      if (error.name === "AbortError") {
        alert("AI识别超时：模型响应较慢。你可以换一张更清晰的图片，或先手动填写信息生成报告。");
      } else {
        console.error(error);
        alert("AI识别失败：" + error.message);
      }
    } finally {
      clearTimeout(timer);
      setAiLoading(false);
    }
  }

  function restoreRecord(record) {
    if (record.product) {
      const { imagePreview, ...restProduct } = record.product;
      setProduct({ ...blankProduct, ...restProduct });
      setImage(imagePreview || null);
    }
    setAnalyzed(true);
    setMode("result");
  }

  function applyDemo(demo) {
    setProduct(demo);
    setImage(null);
    setAiInsight(null);
    setAnalyzed(true);
    setSaveMessage("");
    setPage("app");
    setMode("result");
  }

  function loadDemoRecords() {
    const demoRecords = demoProducts.map((demo, index) => {
      const demoResult = analyzeProduct(demo, false);
      return {
        id: `demo-local-${Date.now()}-${index}`,
        created_at: new Date(Date.now() - index * 3600 * 1000).toISOString(),
        product_name: demo.name,
        category: demo.category,
        score: demoResult.totalScore,
        advice: demoResult.level,
        price: demo.price,
        competitor_price: demo.competitorPrice,
        product: { ...demo, imagePreview: "" },
        result: {
          status: demoResult.status,
          totalScore: demoResult.totalScore,
          level: demoResult.level,
          risks: demoResult.risks,
          scores: demoResult.scores,
          explanations: demoResult.explanations,
          margin: demoResult.margin,
          stockCost: demoResult.stockCost,
          contentPotentialScore: demoResult.contentPotentialScore,
          channelFit: demoResult.channelFit,
          categoryName: demoResult.categoryName,
          review,
        },
        report: demoResult.report,
      };
    });

    const oldRecords = JSON.parse(localStorage.getItem("tradepilot_local_records") || "[]");
    const nextRecords = [...demoRecords, ...oldRecords].slice(0, 50);
    localStorage.setItem("tradepilot_local_records", JSON.stringify(nextRecords));
    setHistoryRecords(nextRecords);
    setHistoryMessage("已加载示例产品到本浏览器产品库，可直接体验筛选、PK和复盘流程。");
  }

  if (page === "cover") {
    return (
      <div className="min-h-screen bg-[#08100d] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-12">
          <div className="mb-6 inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-200">
            TradePilot AI｜拿货搭子 · 进货选品与爆款测款智能体
          </div>

          <h1 className="max-w-5xl text-5xl font-black leading-tight tracking-tight md:text-6xl xl:text-7xl">
            <span className="block text-white">TradePilot AI</span>
            <span className="mt-3 block text-emerald-300">进货前，先算清楚</span>
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            面向小商品进货、内容电商测款和大学生创业场景的 AI 决策工作台，覆盖义乌拿货、校园零售和小微电商，让用户从凭感觉拿货转向先测算、再测款、后复盘。
          </p>
          <div className="mt-5 max-w-4xl rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-100">
            当前为游客演示模式：无需注册即可体验完整流程；产品记录将暂存在本浏览器中，正式版可接入账号体系实现云端同步。
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {painPoints.map((point) => (
              <div key={point} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] px-4 py-3 text-sm font-bold text-amber-100">
                {point}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map(([title, desc], index) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 text-sm font-black text-black">
                  {index + 1}
                </div>
                <h3 className="font-black text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <CoverCard title="项目介绍" desc="了解 TradePilot AI 的目标用户、核心痛点与完整工作流。" onClick={() => { setPage("app"); setMode("intro"); }} />
            <CoverCard title="开始进货判断" desc="上传图片并填写拿货价、MOQ，生成一份可复盘的进货报告。" highlight onClick={() => { setPage("app"); setMode("operate"); }} />
            <CoverCard title="游客快速体验" desc="无需注册登录，直接查看完整案例，体验报告、产品库、PK和复盘流程。" onClick={() => { setPage("app"); setMode("demo"); }} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08100d] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08100d]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <button onClick={() => setPage("cover")} className="text-left">
            <p className="text-sm text-emerald-300">TradePilot AI</p>
            <h1 className="text-xl font-black">进货判断、内容测款与产品复盘</h1>
          </button>

          <div className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-100">
            游客演示模式 · 本地体验不强制登录
          </div>

          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Tab active={mode === "intro"} onClick={() => setMode("intro")}>项目介绍</Tab>
            <Tab active={mode === "operate"} onClick={() => setMode("operate")}>开始判断</Tab>
            <Tab active={mode === "result"} onClick={() => setMode("result")}>进货报告</Tab>
            <Tab active={mode === "history"} onClick={() => { setMode("history"); loadHistoryRecords(); }}>我的产品库</Tab>
            <Tab active={mode === "pk"} onClick={() => { setMode("pk"); loadHistoryRecords(); }}>候选产品PK</Tab>
            <Tab active={mode === "review"} onClick={() => setMode("review")}>测款复盘</Tab>
            <Tab active={mode === "demo"} onClick={() => setMode("demo")}>评委演示</Tab>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {mode === "intro" && <IntroView setMode={setMode} />}
        {mode === "operate" && (
          <OperateView
            product={product}
            update={update}
            image={image}
            setImage={setImage}
            result={result}
            setProduct={setProduct}
            setAnalyzed={setAnalyzed}
            setMode={setMode}
            analyzeImageWithAI={analyzeImageWithAI}
            aiLoading={aiLoading}
          />
        )}
        {mode === "result" && (
          <ResultView
            product={product}
            image={image}
            result={result}
            analyzed={analyzed}
            setMode={setMode}
            copyReport={copyReport}
            copied={copied}
            saveCurrentReport={saveCurrentReport}
            saveMessage={saveMessage}
            aiInsight={aiInsight}
            downloadReport={downloadReport}
          />
        )}
        {mode === "history" && (
          <HistoryView
            records={historyRecords}
            loading={historyLoading}
            message={historyMessage}
            onDelete={deleteHistoryRecord}
            onRestore={restoreRecord}
            onRefresh={loadHistoryRecords}
            onLoadDemo={loadDemoRecords}
            search={historySearch}
            setSearch={setHistorySearch}
            statusFilter={historyStatus}
            setStatusFilter={setHistoryStatus}
            sortMode={historySort}
            setSortMode={setHistorySort}
          />
        )}
        {mode === "pk" && (
          <PKView
            records={historyRecords}
            loading={historyLoading}
            message={historyMessage}
            onRefresh={loadHistoryRecords}
            onRestore={restoreRecord}
            leftId={pkLeftId}
            setLeftId={setPkLeftId}
            rightId={pkRightId}
            setRightId={setPkRightId}
          />
        )}
        {mode === "review" && (
          <ReviewView
            product={product}
            result={result}
            review={review}
            setReview={setReview}
            saveCurrentReport={saveCurrentReport}
            saveMessage={saveMessage}
          />
        )}
        {mode === "demo" && <DemoView applyDemo={applyDemo} />}
      </main>
    </div>
  );
}

function CoverCard({ title, desc, onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[2rem] border p-6 text-left transition hover:-translate-y-1 hover:shadow-2xl ${
        highlight ? "border-emerald-300 bg-emerald-300 text-black shadow-emerald-300/20" : "border-white/10 bg-white/[0.06] text-white"
      }`}
    >
      <h3 className="text-2xl font-black">{title}</h3>
      <p className={`mt-3 text-sm leading-7 ${highlight ? "text-black/70" : "text-slate-400"}`}>{desc}</p>
      <p className="mt-6 font-black">进入 →</p>
    </button>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-2 ${active ? "bg-emerald-300 text-black" : "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]"}`}>
      {children}
    </button>
  );
}

function IntroView({ setMode }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
        <p className="mb-4 inline-flex rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-black">项目介绍</p>
        <h2 className="text-4xl font-black leading-tight">把“凭感觉拿货”变成可记录、可比较、可复盘的选品流程。</h2>
        <p className="mt-5 text-base leading-8 text-slate-300">
          TradePilot AI 帮你在进货前先看利润、风险、人群和内容潜力，再把每次判断保存为产品记录，方便后续做候选比较和测款复盘。
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Info title="核心痛点" items={painPoints} />
          <Info title="目标用户" items={["大学生创业者", "校园零售经营者", "小红书/抖音卖家", "义乌拿货新手", "小微电商", "社群团购运营者"]} />
          <Info title="核心能力" items={["图片识别", "利润测算", "风险判断", "内容测款", "产品库", "候选PK", "测款复盘"]} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-white/10 bg-black/35 p-8">
          <p className="text-sm font-bold text-emerald-300">Why TradePilot AI</p>
          <h3 className="mt-2 text-2xl font-black text-white">为什么需要 TradePilot AI</h3>
          <p className="mt-5 text-sm leading-8 text-slate-300">
            很多新手卖家和大学生创业者第一次进货时，往往依赖主观判断：觉得款式好看、价格便宜、供应商说好卖，就直接下单。但真正的问题在于：利润是否够、MOQ 是否压货、内容平台能不能测出反馈、爆款潜力是否可持续，往往没有被系统评估。
          </p>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            TradePilot AI 希望把这套判断过程结构化，让每一次进货都留下数据、依据和复盘记录，而不是只留下库存压力。
          </p>
          <button onClick={() => setMode("operate")} className="mt-6 rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black shadow-lg shadow-emerald-300/10">
            开始判断一款产品
          </button>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
          <h3 className="text-2xl font-black text-emerald-300">从判断到复盘</h3>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {flowSteps.map(([title, desc], index) => (
              <div key={title} className="rounded-2xl bg-black/25 p-4 text-sm text-slate-300">
                <b className="text-emerald-300">{index + 1}. {title}</b>
                <p className="mt-2 leading-6">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ title, items }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <h3 className="font-black text-white">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full bg-emerald-300/10 px-3 py-1 text-sm font-bold text-emerald-200">{item}</span>
        ))}
      </div>
    </div>
  );
}

function OperateView({ product, update, image, setImage, result, setProduct, setAnalyzed, setMode, analyzeImageWithAI, aiLoading }) {
function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxSize = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedImage = canvas.toDataURL("image/jpeg", 0.72);
        setImage(compressedImage);
        setProduct(blankProduct);
        setAnalyzed(false);
      };

      img.onerror = () => {
        alert("图片读取失败，请换一张图片再试。");
      };

      img.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  }

  function analyze() {
    setAnalyzed(true);
    setMode("result");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
        <h2 className="text-2xl font-black">第一步：上传产品图片</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">建议上传进货样品图、供应商图或产品细节图。图片会参与信息完整度和内容潜力判断。</p>

        <div className="mt-5 grid min-h-80 place-items-center rounded-3xl border border-dashed border-white/20 bg-black/25 p-4">
          {image ? (
            <img src={image} alt="产品图" className="max-h-80 rounded-3xl object-contain" />
          ) : (
            <div className="text-center text-slate-400">
              <p className="text-5xl">📷</p>
              <p className="mt-3 font-bold">暂未上传产品图</p>
            </div>
          )}
        </div>

        <label className="mt-4 block cursor-pointer rounded-2xl bg-emerald-300 px-5 py-3 text-center font-black text-black">
          上传图片
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </label>

        <button onClick={analyzeImageWithAI} disabled={aiLoading} className="mt-3 w-full rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black disabled:opacity-60">
          {aiLoading ? "AI正在识别图片..." : "AI识别图片并自动填写"}
        </button>

        <button onClick={() => { setProduct(initialProduct); setAnalyzed(false); }} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-black text-white">套用示例产品</button>
        <button onClick={() => { setProduct(blankProduct); setImage(null); setAnalyzed(false); }} className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-5 py-3 font-bold text-slate-300">清空重填</button>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">第二步：填写进货信息</h2>
            <p className="mt-2 text-sm text-slate-400">字段越完整，AI判断越可靠。带价格和MOQ才能测算利润与压货风险。</p>
          </div>
          <div className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-300">
            当前评分：{result.totalScore}/100
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input label="产品名称" value={product.name} onChange={(value) => update("name", value)} placeholder="如：珍珠项链" />
          <Input label="产品类型" value={product.category} onChange={(value) => update("category", value)} placeholder="如：饰品/文创/家居" />
          <Input label="拿货价 / 元" value={product.cost} onChange={(value) => update("cost", value)} placeholder="如：3.8" />
          <Input label="建议售价 / 元" value={product.price} onChange={(value) => update("price", value)} placeholder="如：19.9" />
          <Input label="MOQ 最小起订量 / 件" value={product.moq} onChange={(value) => update("moq", value)} placeholder="如：100" />
          <Input label="材质" value={product.material} onChange={(value) => update("material", value)} placeholder="如：合金+仿珍珠" />
          <Input label="目标人群" value={product.audience} onChange={(value) => update("audience", value)} placeholder="如：学生党、通勤人群" />
          <Input label="销售渠道" value={product.channel} onChange={(value) => update("channel", value)} placeholder="如：小红书/抖音/私域" />
          <Input label="供应商信息" value={product.supplier} onChange={(value) => update("supplier", value)} placeholder="如：支持混批，7天补货" wide />
          <Input label="内容关键词" value={product.keywords} onChange={(value) => update("keywords", value)} placeholder="如：温柔风、礼物推荐" wide />
          <Input label="竞品价格" value={product.competitorPrice} onChange={(value) => update("competitorPrice", value)} placeholder="如：15.9-29.9元" />
          <Input label="物流/包装风险" value={product.logistics} onChange={(value) => update("logistics", value)} placeholder="如：小件轻货/易碎" />
          <Input label="补充备注" value={product.note} onChange={(value) => update("note", value)} placeholder="如：适合礼物场景" wide />
        </div>

        <button onClick={analyze} className="mt-5 w-full rounded-2xl bg-emerald-300 px-5 py-4 text-lg font-black text-black">
          生成进货决策报告
        </button>
      </section>
    </div>
  );
}

function ResultView({ product, image, result, analyzed, setMode, copyReport, copied, saveCurrentReport, saveMessage, aiInsight, downloadReport }) {
  return (
    <div className="space-y-6">
      {!analyzed && (
        <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
          当前展示的是实时预览结果，建议返回开始判断页面生成正式报告。
        </div>
      )}

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-emerald-300">Key Conclusion</p>
            <h2 className="text-3xl font-black text-white">进货关键结论</h2>
            <p className="mt-2 text-slate-400">先确认状态和关键指标，再展开查看评分依据与完整报告。</p>
          </div>
          <span className="text-sm font-bold text-cyan-200">状态：{result.status}</span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Card label="综合评分" value={`${result.totalScore}/100`} />
          <Card label="AI建议" value={result.level} />
          <Card label="预计毛利率" value={`${Math.round(result.margin * 100)}%`} />
          <Card label="首批压货" value={`¥${money(result.stockCost)}`} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
            <p className="text-sm text-slate-400">当前产品</p>
            <h2 className="mt-2 text-3xl font-black text-emerald-300">{product.name || "未命名产品"}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Card label="单件利润" value={`¥${money(result.profit)}`} />
              <Card label="单件成本" value={`¥${money(result.unitCost)}`} />
              <Card label="建议售价" value={`¥${product.price || 0}`} />
              <Card label="竞品价格" value={product.competitorPrice || "待补充"} />
            </div>
            {image && <img src={image} alt="产品图" className="mt-5 max-h-80 w-full rounded-3xl object-contain bg-black/30" />}
          </div>
          <SamplingStrategyCard result={result} />
          <MaterialChecklistCard result={result} />
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
          <h2 className="text-2xl font-black">AI评分依据</h2>
          <div className="mt-5 space-y-4">
            {result.explanations.map(([label, value, reason]) => (
              <div key={label} className="rounded-3xl bg-white/[0.06] p-4">
                <Score label={label} value={value} />
                <p className="mt-3 text-sm leading-7 text-slate-300">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {aiInsight && (
        <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-6">
          <h2 className="text-2xl font-black text-cyan-200">AI图片识别结果</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Card label="识别产品" value={aiInsight.product?.name || "未识别"} />
            <Card label="推断品类" value={aiInsight.product?.category || "未识别"} />
            <Card label="置信度" value={aiInsight.confidence || "中等"} />
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <h2 className="text-2xl font-black">小红书内容包</h2>
          <p className="mt-4 rounded-2xl bg-emerald-300 p-4 font-black text-black">封面：{result.market.cover}</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {result.market.xhsTitles.map((title, index) => (
              <p key={title} className="rounded-2xl bg-black/25 p-4">标题{index + 1}：{title}</p>
            ))}
          </div>
          <h3 className="mt-5 font-black text-white">8页图文结构</h3>
          <ol className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
            {result.xhsStructure.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}
          </ol>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <h2 className="text-2xl font-black">抖音视频脚本</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {result.market.douyinScript.map((shot, index) => (
              <p key={shot} className="rounded-2xl bg-black/25 p-4">镜头{index + 1}：{shot}</p>
            ))}
          </div>
          <h3 className="mt-5 font-black text-white">主要风险</h3>
          <div className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
            {result.risks.map((risk, index) => (
              <p key={risk} className="rounded-2xl bg-black/25 p-4"><b className="text-amber-300">风险{index + 1}：</b>{risk}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">完整AI进货报告</h2>
            <p className="mt-2 text-sm text-slate-400">报告可复制给团队、保存到产品库，也可以下载为TXT留档。</p>
            {saveMessage && <p className="mt-3 rounded-2xl bg-emerald-300/10 p-3 text-sm text-emerald-100">{saveMessage}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setMode("operate")} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-bold text-white">返回修改</button>
            <button onClick={saveCurrentReport} className="rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">保存到我的产品库</button>
            <button onClick={copyReport} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">{copied ? "已复制" : "复制给团队"}</button>
            <button onClick={downloadReport} className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 font-black text-emerald-200">下载报告</button>
          </div>
        </div>
        <pre className="mt-5 whitespace-pre-wrap rounded-3xl bg-white/[0.06] p-5 text-sm leading-8 text-slate-200">{result.report}</pre>
      </section>
    </div>
  );
}

function SamplingStrategyCard({ result }) {
  return (
    <section className="rounded-[2rem] border border-emerald-300/15 bg-emerald-300/[0.07] p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Sampling Strategy</p>
      <h3 className="mt-2 text-xl font-black text-white">专属拿样策略</h3>
      <p className="mt-2 text-sm font-bold text-emerald-100">{result.samplingStrategy?.headline}</p>
      <p className="mt-1 text-xs leading-6 text-slate-400">{result.samplingStrategy?.context}</p>
      <div className="mt-4 space-y-2">
        {(result.samplingStrategy?.checkpoints || []).slice(0, 4).map((item) => (
          <p key={item} className="rounded-2xl bg-black/25 px-4 py-3 text-sm leading-6 text-slate-200">{item}</p>
        ))}
      </div>
    </section>
  );
}

function MaterialChecklistCard({ result }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Content Materials</p>
      <h3 className="mt-2 text-xl font-black text-white">本品必拍素材</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {(result.imagePlan?.mustShoot || []).slice(0, 5).map((item) => (
          <span key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-5 text-slate-200">
            {item.split("：")[0]}
          </span>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-amber-300/10 p-3 text-xs leading-6 text-amber-100">
        {result.imagePlan?.missingRisk}
      </p>
    </section>
  );
}

function ReviewView({ product, result, review, setReview, saveCurrentReport, saveMessage }) {
  const views = n(review.views);
  const likes = n(review.likes);
  const saves = n(review.saves);
  const comments = n(review.comments);
  const inquiries = n(review.inquiries);
  const orders = n(review.orders);
  const cost = n(review.cost);

  const engagementRate = views ? ((likes + saves + comments) / views) * 100 : 0;
  const inquiryRate = views ? (inquiries / views) * 100 : 0;
  const conversionRate = inquiries ? (orders / inquiries) * 100 : 0;
  const costPerOrder = orders ? cost / orders : 0;

  let suggestion = "继续观察";
  let suggestionDetail = "先积累足够浏览和询单数据，再判断是否改内容、改价格或补货。";
  if (engagementRate >= 8 && conversionRate < 20 && inquiries > 0) {
    suggestion = "互动高但成交偏低";
    suggestionDetail = "说明内容能吸引用户，但成交信任还没有建立。建议优化售价、详情页、包装展示、材质说明、评价证明和售后承诺。";
  }
  if (views > 0 && engagementRate < 3) {
    suggestion = "内容吸引力不足";
    suggestionDetail = "建议重做封面、标题和前3秒内容，把使用前后对比、佩戴/使用场景和价格利益点提前展示。";
  }
  if (inquiryRate >= 1 && conversionRate < 20 && inquiries >= 5) {
    suggestion = "询单高但成交低";
    suggestionDetail = "用户有购买兴趣，但下单链路可能卡住了。建议检查售价、运费、付款路径、库存说明和客服回复速度。";
  }
  if (orders >= 5 && conversionRate >= 25 && costPerOrder > 0 && costPerOrder <= Math.max(result.profit, 1) * 0.6) {
    suggestion = "成交好且成本可控";
    suggestionDetail = "可以进入小批量补货观察，但仍建议控制首单量，继续跟踪退换货、复购和真实利润。";
  }

  function updateReview(key, value) {
    setReview((old) => ({ ...old, [key]: value }));
  }

  function applyReviewDemo() {
    setReview({
      views: "4200",
      likes: "260",
      saves: "180",
      comments: "42",
      inquiries: "68",
      orders: "16",
      cost: "120",
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
        <p className="text-sm text-emerald-300">Test Review</p>
        <h2 className="text-3xl font-black">测款数据复盘</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">把小红书、抖音或私域的真实反馈填进来，用测款数据辅助下一步补货判断。</p>
        <button onClick={applyReviewDemo} className="mt-5 rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black shadow-lg shadow-emerald-300/10">
          填入示例数据
        </button>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input label="浏览量" value={review.views} onChange={(value) => updateReview("views", value)} placeholder="如：3000" />
          <Input label="点赞数" value={review.likes} onChange={(value) => updateReview("likes", value)} placeholder="如：120" />
          <Input label="收藏数" value={review.saves} onChange={(value) => updateReview("saves", value)} placeholder="如：80" />
          <Input label="评论数" value={review.comments} onChange={(value) => updateReview("comments", value)} placeholder="如：20" />
          <Input label="私信/询单数" value={review.inquiries} onChange={(value) => updateReview("inquiries", value)} placeholder="如：15" />
          <Input label="实际成交数" value={review.orders} onChange={(value) => updateReview("orders", value)} placeholder="如：5" />
          <Input label="测款成本 / 元" value={review.cost} onChange={(value) => updateReview("cost", value)} placeholder="如：50" wide />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <h2 className="text-2xl font-black">测款复盘结论</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Card label="当前产品" value={product.name || "未命名产品"} />
          <Card label="进货评分" value={`${result.totalScore}/100`} />
        </div>

        <div className="mt-5 space-y-4">
          <MetricBar label="互动率" value={engagementRate} max={12} suffix="%" desc="判断内容吸引力，收藏、点赞和评论越集中，说明封面与卖点越能抓住用户。" />
          <MetricBar label="询单率" value={inquiryRate} max={3} suffix="%" desc="判断购买兴趣，用户愿意私信或评论问价，说明产品已经进入购买考虑。" />
          <MetricBar label="成交转化率" value={conversionRate} max={35} suffix="%" desc="判断价格、信任和付款路径是否成立，高询单低成交时优先排查成交阻力。" />
          <MetricBar label="单均测款成本" value={costPerOrder} max={Math.max(result.profit * 1.2, 20)} prefix="¥" desc="判断获客成本是否可接受，单均成本应低于可承受利润空间。" />
        </div>

        <div className="mt-6 rounded-3xl bg-emerald-300 p-5 text-black">
          <p className="text-sm font-bold opacity-70">复盘建议</p>
          <h3 className="mt-2 text-2xl font-black">{suggestion}</h3>
          <p className="mt-3 text-sm leading-7 opacity-80">
            {suggestionDetail}
          </p>
        </div>

        <button onClick={saveCurrentReport} className="mt-5 w-full rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">
          保存本次复盘到我的产品库
        </button>
        {saveMessage && <p className="mt-3 rounded-2xl bg-white/[0.06] p-3 text-sm text-emerald-100">{saveMessage}</p>}
      </section>
    </div>
  );
}

function HistoryView({ records, loading, message, onDelete, onRestore, onRefresh, onLoadDemo, search, setSearch, statusFilter, setStatusFilter, sortMode, setSortMode }) {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRecords = records
    .filter((record) => {
      const status = getRecordStatus(record);
      const name = `${record.product_name || ""} ${record.product?.name || ""}`.toLowerCase();
      const category = `${record.category || ""} ${record.product?.category || ""}`.toLowerCase();
      const matchSearch = !normalizedSearch || name.includes(normalizedSearch) || category.includes(normalizedSearch);
      const matchStatus = statusFilter === "全部" || status.includes(statusFilter);
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortMode === "score_desc") return (b.score || 0) - (a.score || 0);
      if (sortMode === "score_asc") return (a.score || 0) - (b.score || 0);
      if (sortMode === "saved_asc") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-emerald-300">My Product Library</p>
          <h2 className="text-3xl font-black text-white">我的产品库</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">保存进货判断、测款结论和完整报告，形成长期选品资产。</p>
        </div>
        <button onClick={onRefresh} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">刷新产品库</button>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <span className="text-xs font-semibold text-slate-400">搜索产品名称 / 品类</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="如：珍珠、发饰、家居生活" className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
        </label>
        <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <span className="text-xs font-semibold text-slate-400">状态筛选</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
            {statusOptions.map((status) => <option key={status} value={status} className="bg-[#08100d]">{status}</option>)}
          </select>
        </label>
        <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <span className="text-xs font-semibold text-slate-400">排序</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
            <option value="saved_desc" className="bg-[#08100d]">保存时间：最新</option>
            <option value="saved_asc" className="bg-[#08100d]">保存时间：最早</option>
            <option value="score_desc" className="bg-[#08100d]">评分：高到低</option>
            <option value="score_asc" className="bg-[#08100d]">评分：低到高</option>
          </select>
        </label>
      </div>

      {loading && <div className="rounded-3xl bg-black/25 p-6 text-slate-300">正在读取产品库...</div>}
      {message && <div className="mb-4 rounded-3xl bg-amber-300/10 p-5 text-amber-100">{message}</div>}

      {!loading && records.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/20 bg-black/25 p-8 text-center">
          <h3 className="text-2xl font-black text-white">产品库还是空的</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            先生成一份进货报告，再点击“保存到我的产品库”。游客演示模式会把记录暂存在本浏览器中。
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={onRefresh} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-bold text-white">重新读取</button>
            <button onClick={onLoadDemo} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">加载示例产品</button>
          </div>
        </div>
      )}

      {!loading && records.length > 0 && filteredRecords.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/20 bg-black/25 p-8 text-center text-slate-400">
          没有匹配的产品记录。可以调整搜索词或状态筛选。
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filteredRecords.map((record) => (
          <HistoryCard key={record.id} record={record} onDelete={onDelete} onRestore={onRestore} />
        ))}
      </div>
    </section>
  );
}

function HistoryCard({ record, onDelete, onRestore }) {
  const metrics = getRecordMetrics(record);
  return (
    <article className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div className="flex gap-4">
        {record.product?.imagePreview && <img src={record.product.imagePreview} alt="" className="h-24 w-24 rounded-2xl object-cover" />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-black text-white">{record.product_name || "未命名产品"}</h3>
          <p className="mt-2 text-sm text-slate-400">{record.category || "未分类"} · {new Date(record.created_at).toLocaleString()}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-emerald-300/10 px-3 py-1 font-bold text-emerald-200">评分：{record.score ?? "暂无"}</span>
            <span className="px-1 py-1 font-bold text-cyan-200">状态：{metrics.status}</span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 font-bold text-slate-300">售价：{record.price || "待补充"}</span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 font-bold text-slate-300">毛利率：{Math.round(metrics.margin * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => onRestore(record)} className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-black">查看报告</button>
        <button onClick={() => onDelete(record.id)} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white">删除</button>
      </div>

      {record.report && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-bold text-emerald-300">展开报告</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/[0.06] p-4 text-xs leading-6 text-slate-300">{record.report}</pre>
        </details>
      )}
    </article>
  );
}

function PKView({ records, loading, message, onRefresh, onRestore, leftId, setLeftId, rightId, setRightId }) {
  const sorted = [...records].sort((a, b) => (b.score || 0) - (a.score || 0));
  const left = sorted.find((record) => record.id === leftId) || sorted[0] || null;
  const right = sorted.find((record) => record.id === rightId) || sorted.find((record) => record.id !== left?.id) || null;
  const leftMetrics = left ? getRecordMetrics(left) : null;
  const rightMetrics = right ? getRecordMetrics(right) : null;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-emerald-300">Candidate PK</p>
          <h2 className="text-3xl font-black">候选产品PK</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">按已保存产品的评分排序，帮助你快速比较哪些款更适合优先拿样、继续测款或进入补货观察。</p>
        </div>
        <button onClick={onRefresh} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">刷新候选池</button>
      </div>

      {loading && <div className="rounded-3xl bg-black/25 p-6 text-slate-300">正在读取候选产品...</div>}
      {message && <div className="mb-4 rounded-3xl bg-amber-300/10 p-5 text-amber-100">{message}</div>}

      {!loading && sorted.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/20 bg-black/25 p-8 text-center text-slate-400">
          还没有候选产品。先保存几份进货报告，再回来比较候选款。
        </div>
      )}

      {sorted.length === 1 && (
        <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
          当前只有一个候选产品。保存至少两个产品后，就可以进行完整 PK。
        </div>
      )}

      {sorted.length >= 2 && (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <span className="text-xs font-semibold text-slate-400">候选产品 A</span>
              <select value={left?.id || ""} onChange={(event) => setLeftId(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
                {sorted.map((record) => <option key={record.id} value={record.id} className="bg-[#08100d]">{record.product_name}</option>)}
              </select>
            </label>
            <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <span className="text-xs font-semibold text-slate-400">候选产品 B</span>
              <select value={right?.id || ""} onChange={(event) => setRightId(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
                {sorted.map((record) => <option key={record.id} value={record.id} className="bg-[#08100d]">{record.product_name}</option>)}
              </select>
            </label>
          </div>

          <div className="rounded-3xl bg-emerald-300 p-6 text-black">
            <p className="text-sm font-bold opacity-70">AI 推荐结论</p>
            <h3 className="mt-2 text-2xl font-black">{getPkRecommendation(left, right)}</h3>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
            <div className="grid grid-cols-[0.9fr_1fr_1fr] border-b border-white/10 bg-white/[0.06] text-sm font-black text-slate-200">
              <div className="p-4">对比维度</div>
              <div className="p-4">{left?.product_name}</div>
              <div className="p-4">{right?.product_name}</div>
            </div>
            <PkMetricRow label="评分" left={`${leftMetrics?.score || 0}/100`} right={`${rightMetrics?.score || 0}/100`} />
            <PkMetricRow label="状态" left={`状态：${leftMetrics?.status || "待判断"}`} right={`状态：${rightMetrics?.status || "待判断"}`} />
            <PkMetricRow label="毛利率" left={`${Math.round((leftMetrics?.margin || 0) * 100)}%`} right={`${Math.round((rightMetrics?.margin || 0) * 100)}%`} />
            <PkMetricRow label="首批压货" left={`¥${money(leftMetrics?.stockCost || 0)}`} right={`¥${money(rightMetrics?.stockCost || 0)}`} />
            <PkMetricRow label="风险数量" left={`${leftMetrics?.riskCount || 0} 个`} right={`${rightMetrics?.riskCount || 0} 个`} />
            <PkMetricRow label="内容潜力" left={`${leftMetrics?.contentPotential || 0}/100`} right={`${rightMetrics?.contentPotential || 0}/100`} />
            <PkMetricRow label="渠道适配" left={leftMetrics?.channelFit || "待补充"} right={rightMetrics?.channelFit || "待补充"} />
            <div className="grid grid-cols-[0.9fr_1fr_1fr] border-t border-white/10">
              <div className="p-4 text-sm font-bold text-slate-400">操作</div>
              <div className="p-4"><button onClick={() => left && onRestore(left)} className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-black">查看</button></div>
              <div className="p-4"><button onClick={() => right && onRestore(right)} className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-black">查看</button></div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4">
        {sorted.map((record, index) => (
          <div key={record.id} className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-300">#{index + 1}</p>
                <h3 className="text-2xl font-black">{record.product_name}</h3>
                <p className="mt-2 text-sm text-slate-400">{record.advice}</p>
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <span className="rounded-full bg-emerald-300/10 px-3 py-2 font-bold text-emerald-200">评分 {record.score ?? 0}</span>
                <span className="px-1 py-2 font-bold text-cyan-200">状态：{getRecordStatus(record)}</span>
                <button onClick={() => onRestore(record)} className="rounded-full bg-emerald-300 px-3 py-2 font-black text-black">查看</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DemoView({ applyDemo }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <p className="text-sm text-emerald-300">Judge Demo</p>
      <h2 className="text-3xl font-black">评委快速演示</h2>
      <p className="mt-2 text-sm leading-7 text-slate-400">不用依赖实时识图接口，直接查看多个不同品类的完整判断结果，保证现场展示稳定。</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {demoProducts.map((demo) => (
          <button key={demo.name} onClick={() => applyDemo(demo)} className="rounded-[2rem] border border-white/10 bg-black/30 p-6 text-left transition hover:-translate-y-1 hover:bg-white/[0.08]">
            <p className="text-sm text-emerald-300">{demo.category}</p>
            <h3 className="mt-2 text-2xl font-black text-white">{demo.name}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-400">{demo.note}</p>
            <p className="mt-5 font-black text-emerald-300">查看完整案例 →</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function Input({ label, value, onChange, placeholder, wide }) {
  return (
    <label className={`rounded-2xl border border-white/10 bg-black/25 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
    </label>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function PkMetricRow({ label, left, right }) {
  return (
    <div className="grid grid-cols-[0.9fr_1fr_1fr] border-b border-white/10 text-sm">
      <div className="p-4 font-bold text-slate-400">{label}</div>
      <div className="p-4 font-semibold text-slate-100">{left}</div>
      <div className="p-4 font-semibold text-slate-100">{right}</div>
    </div>
  );
}

function Score({ label, value }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-300">{label}</span>
        <span className="font-black text-emerald-300">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MetricBar({ label, value, max, desc, suffix = "", prefix = "" }) {
  const safeMax = max > 0 ? max : 1;
  const width = clamp((value / safeMax) * 100, 0, 100);
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-black text-white">{label}</span>
        <span className="font-black text-emerald-300">{prefix}{money(value)}{suffix}</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-3 text-xs leading-6 text-slate-400">{desc}</p>
    </div>
  );
}

export default App;
